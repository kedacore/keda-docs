+++
fragment = "content"
weight = 100

title = "Authentication"

[sidebar]
  sticky = true
+++

Often a scaler will require authentication or secrets and config in order for KEDA to check for events and monitor the event rate.  KEDA provides a few secure patterns to add those secrets to a `ScaledOjbect`.

## Referencing secrets and config maps

Some metadata parameters will not allow resolving from a literal value, and will instead require a reference to a secret, config map, or environment variable defined on the target deployment.

For example, if using the [RabbitMQ scaler](https://keda.sh/scalers/rabbitmq-queue/), the `host` parameter may include passwords so is required to be a reference.  You can create a secret with the value of the `host` string, mount that secret to the deployment, and reference it from the `ScaledObject` like below:

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
apiVersion: keda.k8s.io/v1alpha1
kind: ScaledObject
metadata:
  name: {deployment-name}
  namespace: default
  labels:
    deploymentName: {deployment-name}
spec:
  scaleTargetRef:
    deploymentName: {deployment-name}
  triggers:
  - type: rabbitmq
    metadata:
      queueName: hello
      host: {secret-key-name}
      queueLength  : '5'
```

If you have multiple containers in a deployment, you will need to include the name of the container that has the references in the `ScaledObject`.  If you do not include a `containerName` it will default to the first container.  KEDA will attempt to resolve references from secrets, config maps, and environment variables of the container.

> TIP: If creating a deployment yaml that references a secret, be sure the secret is created before the deployment that references it, and the scaledObject after both of them to avoid race conditions.

While this method works for many scenarios, there are some downsides.  With the container reference approach, it means every reference the `ScaledObject` needs must be included on the container.  It also doesn't support a model where other types of authentication may work - namely "pod identity" where access to a source could be acquired with no secrets or connection strings.  For these and other reasons, we also provide a `TriggerAuthentication` resource to define authentication as a separate resource to a `ScaledObject`, which can reference secrets directly or supply configuration like pod identiy.

## TriggerAuthentication

`TriggerAuthentication` allows you to define once how to authenticate and use it for multiple triggers across different teams, without them knowing where the secrets are.  It also enables more advanced methods of authentication like "pod identity."

```yaml
apiVersion: keda.k8s.io/v1alpha1
kind: TriggerAuthentication
metadata:
  name: {trigger-auth-name}
  namespace: keda
spec:
  podIdentity:
      provider: none | azure | gcp | spiffe # Optional. Default: none
  secretTargetRef: # Optional.
  - parameter: {scaledObject-parameter-name} # Required.
    name: {secret-name} # Required.
    key: {secret-key-name} # Required.
  env: # Optional.
  - parameter: {scaledObject-parameter-name} # Required.
    name: {env-name} # Required.
    containerName: {container-name} # Optional. Default: scaleTargetRef.containerName of ScaledObject
```

Based on the requirements you can mix and match the reference types providers in order to configure all required parameters.

### Environment variable(s)

You can pull information via one or more environment variables by providing the `name` of the variable for a given `containerName`.

```yaml
env: # Optional.
  - parameter: region # Required.
    name: my-env-var # Required.
    containerName: my-container # Optional. Default: scaleTargetRef.containerName of ScaledObject
```

**Assumptions:** `containerName` is in the same deployment as the configured `scaleTargetRef.deploymentName` in the ScaledObject, unless specified otherwise.

### Secret(s)

You can pull one or more secrets into the trigger by defining the `name` of the Kubernetes Secret and the `key` to use.

```yaml
secretTargetRef: # Optional.
  - parameter: connectionString # Required.
    name: my-keda-secret-entity # Required.
    key: azure-storage-connectionstring # Required.
```

**Assumptions:** `namespace` is in the same deployment as the configured `scaleTargetRef.deploymentName` in the ScaledObject, unless specified otherwise.

### Pod Authentication Providers

Several service providers allow you to assign an identity to a pod. By using that identity, you can defer authentication to the pod & the service provider, rather than configuring secrets.

Currently we support the following:

```yaml
podIdentity:
  provider: none | azure # Optional. Default: false
```

#### Azure Pod Identity

Azure Pod Identity is an implementation of [Azure AD Pod Identity](https://github.com/Azure/aad-pod-identity) which let's you bind an [Azure Managed Identity](https://docs.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/) to a Pod in a Kubernetes cluster as delegated access.

You can tell KEDA to use Azure AD Pod Identity via `podIdentity.provider`.

- https://docs.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/

```yaml
podIdentity:
  provider: azure # Optional. Default: false
```

Azure AD Pod Identity will give access to containers with a defined label for `aadpodidbinding`.  You can set this label on the KEDA operator deployment.  This can be done for you during deployment with Helm with `--set aadPodIdentity={your-label-name}`.