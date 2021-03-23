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

While this method works for many scenarios, there are some downsides.  This method makes it difficult to efficiently share auth config across `ScaledObjects`.  It also doesn’t support referencing a secret directly, only secrets that are referenced by the container.  This method also doesn't support a model where other types of authentication may work - namely "pod identity" where access to a source could be acquired with no secrets or connection strings.  For these and other reasons, we also provide a `TriggerAuthentication` resource to define authentication as a separate resource to a `ScaledObject`, which can reference secrets directly or supply configuration like pod identity.

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
  name: {trigger-auth-name}
  namespace: default # must be same namespace as the ScaledObject
spec:
  podIdentity:
      provider: none | azure | gcp | spiffe | aws-eks | aws-kiam  # Optional. Default: none
  secretTargetRef:                                    # Optional.
  - parameter: {scaledObject-parameter-name}          # Required.
    name: {secret-name}                               # Required.
    key: {secret-key-name}                            # Required.
  env:                                                # Optional.
  - parameter: {scaledObject-parameter-name}          # Required.
    name: {env-name}                                  # Required.
    containerName: {container-name}                   # Optional. Default: scaleTargetRef.envSourceContainerName of ScaledObject
  hashiCorpVault:                                     # Optional.
    address: {hashicorp-vault-address}                # Required.
    authentication: token | kubernetes                # Required.
    role: {hashicorp-vault-role}                      # Optional.
    mount: {hashicorp-vault-mount}                    # Optional.
    credential:                                       # Optional.
      token: {hashicorp-vault-token}                  # Optional.
      serviceAccount: {path-to-service-account-file}  # Optional.
    secrets:                                          # Required.
    - parameter: {scaledObject-parameter-name}        # Required.
      key: {hasicorp-vault-secret-key-name}           # Required.
      path: {hasicorp-vault-secret-path}              # Required.
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
      name: {trigger-authencation-name} # this may define other params not defined in metadata
```

## Authentication scopes: Namespace vs. Cluster

Each `TriggerAuthentication` is defined in one namespace and can only be used by a `ScaledObject` in that same namespace. For cases where you want to share a single set of credentials between scalers in many namespaces, you can instead create a `ClusterTriggerAuthentication`. As a global object, this can be used from any namespace. To set a trigger to use a `ClusterTriggerAuthentication`, add a `kind` field to the authentication reference:

```yaml
    authenticationRef:
      name: {trigger-authencation-name}
      kind: ClusterTriggerAuthentication
```

By default, Secrets loaded from a `secretTargetRef` must be in the same namespace as KEDA is deployed in (usually `keda`). This can be overridden by setting a `KEDA_CLUSTER_OBJECT_NAMESPACE` environment variable for the `keda-operator` container.

Defining a `ClusterTriggerAuthentication` works almost identically to a `TriggerAuthentication`, except there is no `metadata.namespace` value:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ClusterTriggerAuthentication
metadata:
  name: {cluster-trigger-auth-name}
spec:
  # As before ...
```

## Authentication parameters

Authentication parameters can be pulled in from many sources. All of these values are merged together to make the authentication data for the scaler.

### Environment variable(s)

You can pull information via one or more environment variables by providing the `name` of the variable for a given `containerName`.

```yaml
env:                              # Optional.
  - parameter: region             # Required - Defined by the scale trigger
    name: my-env-var              # Required.
    containerName: my-container   # Optional. Default: scaleTargetRef.envSourceContainerName of ScaledObject
```

**Assumptions:** `containerName` is in the same resource as referenced by `scaleTargetRef.name` in the ScaledObject, unless specified otherwise.

### Secret(s)

You can pull one or more secrets into the trigger by defining the `name` of the Kubernetes Secret and the `key` to use.

```yaml
secretTargetRef:                          # Optional.
  - parameter: connectionString           # Required - Defined by the scale trigger
    name: my-keda-secret-entity           # Required.
    key: azure-storage-connectionstring   # Required.
```

**Assumptions:** `namespace` is in the same resource as referenced by `scaleTargetRef.name` in the ScaledObject, unless specified otherwise.

### Hashicorp Vault secret(s)

You can pull one or more Hashicorp Vault secrets into the trigger by defining the autentication metadata such as Vault `address` and the `authentication` method (token | kubernetes). If you choose kubernetes auth method you should provide `role` and `mount` as well.
`credential` defines the Hashicorp Vault credentials depending on the authentication method, for kubernetes you should provide path to service account token (/var/run/secrets/kubernetes.io/serviceaccount/token) and for token auth method provide the token.
`secrets` list defines the mapping between the path and the key of the secret in Vault to the parameter.

```yaml
hashiCorpVault:                                     # Optional.
  address: {hashicorp-vault-address}                # Required.
  authentication: token | kubernetes                # Required.
  role: {hashicorp-vault-role}                      # Optional.
  mount: {hashicorp-vault-mount}                    # Optional.
  credential:                                       # Optional.
    token: {hashicorp-vault-token}                  # Optional.
    serviceAccount: {path-to-service-account-file}  # Optional.
  secrets:                                          # Required.
  - parameter: {scaledObject-parameter-name}        # Required.
    key: {hasicorp-vault-secret-key-name}           # Required.
    path: {hasicorp-vault-secret-path}              # Required.
```

### Pod Authentication Providers

Several service providers allow you to assign an identity to a pod. By using that identity, you can defer authentication to the pod & the service provider, rather than configuring secrets.

Currently we support the following:

```yaml
podIdentity:
  provider: none | azure | gcp | spiffe | aws-eks | aws-kiam  # Optional. Default: none
```

#### Azure Pod Identity

Azure Pod Identity is an implementation of [**Azure AD Pod Identity**](https://github.com/Azure/aad-pod-identity) which let's you bind an [**Azure Managed Identity**](https://docs.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/) to a Pod in a Kubernetes cluster as delegated access - *Don't manage secrets, let Azure AD do the hard work*.

You can tell KEDA to use Azure AD Pod Identity via `podIdentity.provider`.

```yaml
podIdentity:
  provider: azure # Optional. Default: false
```

Azure AD Pod Identity will give access to containers with a defined label for `aadpodidbinding`.  You can set this label on the KEDA operator deployment.  This can be done for you during deployment with Helm with `--set podIdentity.activeDirectory.identity={your-label-name}`.

#### EKS Pod Identity Webhook for AWS

[**EKS Pod Identity Webhook**](https://github.com/aws/amazon-eks-pod-identity-webhook), which is described more in depth [here](https://aws.amazon.com/blogs/opensource/introducing-fine-grained-iam-roles-service-accounts/), allows you to provide the role name using an annotation on a service account associated with your pod.

You can tell KEDA to use EKS Pod Identity Webhook via `podIdentity.provider`.

```yaml
podIdentity:
  provider: aws-eks # Optional. Default: false
```

#### Kiam Pod Identity for AWS

[**Kiam**](https://github.com/uswitch/kiam/) lets you bind an AWS IAM Role to a pod using an annotation on the pod.

You can tell KEDA to use Kiam via `podIdentity.provider`.

```yaml
podIdentity:
  provider: aws-kiam # Optional. Default: false
```
