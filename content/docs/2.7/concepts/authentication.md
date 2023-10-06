+++
title = "Authentication"
weight = 500
+++

Often a scaler will require authentication or secrets and config to check for events.

KEDA provides a few secure patterns to manage authentication flows:

* Configure authentication per `ScaledObject`
* Re-use per-namespace credentials or delegate authentication with `TriggerAuthentication`
* Re-use global credentials with `ClusterTriggerAuthentication`

## Defining secrets and config maps on ScaledObject

Some metadata parameters will not allow resolving from a literal value, and will instead require a reference to a secret, config map, or environment variable defined on the target container.

> 💡 ***TIP:*** *If creating a deployment yaml that references a secret, be sure the secret is created before the deployment that references it, and the scaledObject after both of them to avoid invalid references.*

### Example

If using the [RabbitMQ scaler](https://keda.sh/docs/2.1/scalers/rabbitmq-queue/), the `host` parameter may include passwords so is required to be a reference.  You can create a secret with the value of the `host` string, reference that secret in the deployment, and map it to the `ScaledObject` metadata parameter like below:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: {secret-name}
data:
  {secret-key-name}: YW1xcDovL3VzZXI6UEFTU1dPUkRAcmFiYml0bXEuZGVmYXVsdC5zdmMuY2x1c3Rlci5sb2NhbDo1Njcy #base64 encoded per secret spec
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {deployment-name}
  namespace: default
  labels:
    app: {deployment-name}
spec:
  selector:
    matchLabels:
      app: {deployment-name}
  template:
    metadata:
      labels:
        app: {deployment-name}
    spec:
      containers:
      - name: {deployment-name}
        image: {container-image}
        envFrom:
        - secretRef:
            name: {secret-name}
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: {scaled-object-name}
  namespace: default
spec:
  scaleTargetRef:
    name: {deployment-name}
  triggers:
  - type: rabbitmq
    metadata:
      queueName: hello
      host: {secret-key-name}
      queueLength  : '5'
```

If you have multiple containers in a deployment, you will need to include the name of the container that has the references in the `ScaledObject`.  If you do not include a `envSourceContainerName` it will default to the first container.  KEDA will attempt to resolve references from secrets, config maps, and environment variables of the container.

### The downsides

While this method works for many scenarios, there are some downsides:

* **Difficult to efficiently share auth** config across `ScaledObjects`
* **No support for referencing a secret directly**, only secrets that are referenced by the container
* **No support for other types of authentication flows** such as *pod identity* where access to a source could be acquired with no secrets or connection strings

For these and other reasons, we also provide a `TriggerAuthentication` resource to define authentication as a separate resource to a `ScaledObject`. This allows you to reference secrets directly, configure to use pod identity or use authentication object managed by a different team.

## Re-use credentials and delegate auth with TriggerAuthentication

`TriggerAuthentication` allows you to describe authentication parameters separate from the `ScaledObject` and the deployment containers.  It also enables more advanced methods of authentication like "pod identity", authentication re-use or allowing IT to configure the authentication.

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: {trigger-authentication-name}
  namespace: default # must be same namespace as the ScaledObject
spec:
  podIdentity:
      provider: none | azure | aws-eks | aws-kiam | gcp  # Optional. Default: none
  secretTargetRef:                                       # Optional.
  - parameter: {scaledObject-parameter-name}             # Required.
    name: {secret-name}                                  # Required.
    key: {secret-key-name}                               # Required.
  env:                                                   # Optional.
  - parameter: {scaledObject-parameter-name}             # Required.
    name: {env-name}                                     # Required.
    containerName: {container-name}                      # Optional. Default: scaleTargetRef.envSourceContainerName of ScaledObject
  hashiCorpVault:                                        # Optional.
    address: {hashicorp-vault-address}                   # Required.
    namespace: {hashicorp-vault-namespace}               # Optional. Default is root namespace. Useful for Vault Enterprise
    authentication: token | kubernetes                   # Required.
    role: {hashicorp-vault-role}                         # Optional.
    mount: {hashicorp-vault-mount}                       # Optional.
    credential:                                          # Optional.
      token: {hashicorp-vault-token}                     # Optional.
      serviceAccount: {path-to-service-account-file}     # Optional.
    secrets:                                             # Required.
    - parameter: {scaledObject-parameter-name}           # Required.
      key: {hasicorp-vault-secret-key-name}              # Required.
      path: {hasicorp-vault-secret-path}                 # Required.
  azureKeyVault:                                         # Optional.
    vaultUri: {key-vault-address}                        # Required.
    credentials:                                         # Required.
      clientId: {azure-ad-client-id}                     # Required.
      clientSecret:                                      # Required.
        valueFrom:                                       # Required.
          secretKeyRef:                                  # Required.
            name: {k8s-secret-with-azure-ad-secret}      # Required.
            key: {key-within-the-secret}                 # Required.
      tenantId: {azure-ad-tenant-id}                     # Required.
    cloud:                                               # Optional.
      type: AzurePublicCloud | AzureUSGovernmentCloud | AzureChinaCloud | AzureGermanCloud | Private # Required.
      keyVaultResourceURL: {key-vault-resource-url-for-cloud}         # Required when type = Private.
      activeDirectoryEndpoint: {active-directory-endpoint-for-cloud}  # Required when type = Private.
    secrets:                                             # Required.
    - parameter: {param-name-used-for-auth}              # Required.
      name: {key-vault-secret-name}                      # Required.
      version: {key-vault-secret-version}                # Optional.
```

Based on the requirements you can mix and match the reference types providers in order to configure all required parameters.

Every parameter you define in `TriggerAuthentication` definition does not need to be included in the `metadata` of the trigger for your `ScaledObject` definition. To reference a `TriggerAuthentication` from a `ScaledObject` you add the `authenticationRef` to the trigger.

```yaml
# some Scaled Object
# ...
  triggers:
  - type: {scaler-type}
    metadata:
      param1: {some-value}
    authenticationRef:
      name: {trigger-authentication-name} # this may define other params not defined in metadata
```

## Authentication scopes: Namespace vs. Cluster

Each `TriggerAuthentication` is defined in one namespace and can only be used by a `ScaledObject` in that same namespace. For cases where you want to share a single set of credentials between scalers in many namespaces, you can instead create a `ClusterTriggerAuthentication`. As a global object, this can be used from any namespace. To set a trigger to use a `ClusterTriggerAuthentication`, add a `kind` field to the authentication reference:

```yaml
    authenticationRef:
      name: {cluster-trigger-authentication-name}
      kind: ClusterTriggerAuthentication
```

By default, Secrets loaded from a `secretTargetRef` must be in the same namespace as KEDA is deployed in (usually `keda`). This can be overridden by setting a `KEDA_CLUSTER_OBJECT_NAMESPACE` environment variable for the `keda-operator` container.

Defining a `ClusterTriggerAuthentication` works almost identically to a `TriggerAuthentication`, except there is no `metadata.namespace` value:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ClusterTriggerAuthentication
metadata:
  name: {cluster-trigger-authentication-name}
spec:
  # As before ...
```

## Available authentication providers for KEDA

Authentication parameters can be retrieved from a variety of authentication providers in KEDA:

{{< authentication-providers >}}
