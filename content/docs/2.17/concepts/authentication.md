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
      provider: none | azure-workload | aws | aws-eks | gcp  # Optional. Default: none
      identityId: <identity-id>                                           # Optional. Only used by azure & azure-workload providers.
      roleArn: <role-arn>                                                 # Optional. Only used by aws provider.
      identityOwner: keda|workload                                        # Optional. Only used by aws provider.
  secretTargetRef:                                                        # Optional.
  - parameter: {scaledObject-parameter-name}                              # Required.
    name: {secret-name}                                                   # Required.
    key: {secret-key-name}                                                # Required.
  env:                                                                    # Optional.
  - parameter: {scaledObject-parameter-name}                              # Required.
    name: {env-name}                                                      # Required.
    containerName: {container-name}                                       # Optional. Default: scaleTargetRef.envSourceContainerName of ScaledObject
  hashiCorpVault:                                                         # Optional.
    address: {hashicorp-vault-address}                                    # Required.
    namespace: {hashicorp-vault-namespace}                                # Optional. Default is root namespace. Useful for Vault Enterprise
    authentication: token | kubernetes                                    # Required.
    role: {hashicorp-vault-role}                                          # Optional.
    mount: {hashicorp-vault-mount}                                        # Optional.
    credential:                                                           # Optional.
      token: {hashicorp-vault-token}                                      # Optional.
      serviceAccount: {path-to-service-account-file}                      # Optional.
    secrets:                                                              # Required.
    - parameter: {scaledObject-parameter-name}                            # Required.
      key: {hashicorp-vault-secret-key-name}                              # Required.
      path: {hashicorp-vault-secret-path}                                 # Required.
  azureKeyVault:                                                          # Optional.
    vaultUri: {key-vault-address}                                         # Required.
    podIdentity:                                                          # Optional. Required when using pod identity.
      provider: azure-workload                                            # Required.
      identityId: <identity-id>                                           # Optional
    credentials:                                                          # Optional. Required when not using pod identity.
      clientId: {azure-ad-client-id}                                      # Required.
      clientSecret:                                                       # Required.
        valueFrom:                                                        # Required.
          secretKeyRef:                                                   # Required.
            name: {k8s-secret-with-azure-ad-secret}                       # Required.
            key: {key-within-the-secret}                                  # Required.
      tenantId: {azure-ad-tenant-id}                                      # Required.
    cloud:                                                                # Optional.
      type: AzurePublicCloud | AzureUSGovernmentCloud | AzureChinaCloud | AzureGermanCloud | Private # Required.
      keyVaultResourceURL: {key-vault-resource-url-for-cloud}             # Required when type = Private.
      activeDirectoryEndpoint: {active-directory-endpoint-for-cloud}      # Required when type = Private.
    secrets:                                                              # Required.
    - parameter: {param-name-used-for-auth}                               # Required.
      name: {key-vault-secret-name}                                       # Required.
      version: {key-vault-secret-version}                                 # Optional.
  awsSecretManager:
    podIdentity:                                                          # Optional.
      provider: aws                                                       # Required.
    credentials:                                                          # Optional.
      accessKey:                                                          # Required.
        valueFrom:                                                        # Required.
          secretKeyRef:                                                   # Required.
            name: {k8s-secret-with-aws-credentials}                       # Required.
            key: AWS_ACCESS_KEY_ID                                        # Required.
      accessSecretKey:                                                    # Required.
        valueFrom:                                                        # Required.
          secretKeyRef:                                                   # Required.
            name: {k8s-secret-with-aws-credentials}                       # Required.
            key: AWS_SECRET_ACCESS_KEY                                    # Required.
    region: {aws-region}                                                  # Optional.
    secrets:                                                              # Required.
    - parameter: {param-name-used-for-auth}                               # Required.
      name: {aws-secret-name}                                             # Required.
      version: {aws-secret-version}                                       # Optional.
  gcpSecretManager:                                                       # Optional.
    secrets:                                                              # Required.
      - parameter: {param-name-used-for-auth}                             # Required.
        id: {secret-manager-secret-name}                                  # Required.
        version: {secret-manager-secret-name}                             # Optional.
    podIdentity:                                                          # Optional.
      provider: gcp                                                       # Required.
    credentials:                                                          # Optional.
      clientSecret:                                                       # Required.
        valueFrom:                                                        # Required.
          secretKeyRef:                                                   # Required.
            name: {k8s-secret-with-gcp-iam-sa-secret}                     # Required.
            key: {key-within-the-secret}                                  # Required.
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

## Authentication parameters

Authentication parameters can be pulled in from many sources. All of these values are merged together to make the authentication data for the scaler. You can find the all the available authentications [here](./../authentication-providers/).

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

### Bound service account token(s)

You can pull one or more service account tokens into the trigger by defining the `serviceAccountName` of the Kubernetes service account.

```yaml
boundServiceAccountToken:                   # Optional.
  - parameter: connectionString             # Required - Defined by the scale trigger
    serviceAccountName: my-service-account  # Required.
```

**Assumptions:** `namespace` is in the same resource as referenced by `scaleTargetRef.name` in the ScaledObject, unless specified otherwise.

### Hashicorp Vault secret(s)

You can pull one or more Hashicorp Vault secrets into the trigger by defining the authentication metadata such as Vault `address` and the `authentication` method (token | kubernetes). If you choose kubernetes auth method you should provide `role` and `mount` as well.
`credential` defines the Hashicorp Vault credentials depending on the authentication method, for kubernetes you should provide path to service account token (the default value is `/var/run/secrets/kubernetes.io/serviceaccount/token`) and for token auth method provide the token.
`secrets` list defines the mapping between the path and the key of the secret in Vault to the parameter.
`namespace` may be used to target a given Vault Enterprise namespace.

```yaml
hashiCorpVault:                                     # Optional.
  address: {hashicorp-vault-address}                # Required.
  namespace: {hashicorp-vault-namespace}            # Optional. Default is root namespace. Useful for Vault Enterprise
  authentication: token | kubernetes                # Required.
  role: {hashicorp-vault-role}                      # Optional.
  mount: {hashicorp-vault-mount}                    # Optional.
  credential:                                       # Optional.
    token: {hashicorp-vault-token}                  # Optional.
    serviceAccount: {path-to-service-account-file}  # Optional. Default is /var/run/secrets/kubernetes.io/serviceaccount/token
  secrets:                                          # Required.
  - parameter: {scaledObject-parameter-name}        # Required.
    key: {hashicorp-vault-secret-key-name}           # Required.
    path: {hashicorp-vault-secret-path}              # Required.
```

### Azure Key Vault secret(s)

You can pull secrets from Azure Key Vault into the trigger by using the `azureKeyVault` key.

The `secrets` list defines the mapping between the key vault secret and the authentication parameter.

You can use pod identity providers `azure` or `azure-workload` to authenticate to the key vault by specifying it in the
`TriggerAuthentication` / `ClusterTriggerAuthentication` definition. Pod Identity binding needs to be applied in the keda namespace.

If you do not wish to use a pod identity provider, you need to register an [application](https://docs.microsoft.com/en-us/azure/active-directory/develop/app-objects-and-service-principals) with Azure Active Directory and specify its credentials. The `clientId` and `tenantId` for the application are to be provided as part of the spec. The `clientSecret` for the application is expected to be within a kubernetes secret in the same namespace as the authentication resource.

Ensure that "read secret" permissions have been granted to the managed identity / Azure AD application on the Azure Key Vault. Learn more in the Azure Key Vault [documentation](https://docs.microsoft.com/en-us/azure/key-vault/general/assign-access-policy?tabs=azure-portal).

The `cloud` parameter can be used to specify cloud environments besides `Azure Public Cloud`, such as known Azure clouds like
`Azure China Cloud`, etc. and even Azure Stack Hub or Air Gapped clouds.

```yaml
azureKeyVault:                                          # Optional.
  vaultUri: {key-vault-address}                         # Required.
  credentials:                                          # Optional. Required when not using pod identity.
    clientId: {azure-ad-client-id}                      # Required.
    clientSecret:                                       # Required.
      valueFrom:                                        # Required.
        secretKeyRef:                                   # Required.
          name: {k8s-secret-with-azure-ad-secret}       # Required.
          key: {key-within-the-secret}                  # Required.
    tenantId: {azure-ad-tenant-id}                      # Required.
  cloud:                                                # Optional.
    type: AzurePublicCloud | AzureUSGovernmentCloud | AzureChinaCloud | AzureGermanCloud | Private # Required.
    keyVaultResourceURL: {key-vault-resource-url-for-cloud}           # Required when type = Private.
    activeDirectoryEndpoint: {active-directory-endpoint-for-cloud}    # Required when type = Private.
  secrets:                                              # Required.
  - parameter: {param-name-used-for-auth}               # Required.
    name: {key-vault-secret-name}                       # Required.
    version: {key-vault-secret-version}                 # Optional.
```

### GCP Secret Manager secret(s)

You can pull secrets from GCP Secret Manager into the trigger by using the `gcpSecretManager` key.

The `secrets` list defines the mapping between the secret and the authentication parameter.

GCP IAM Service Account credentials can be used for authenticating with the Secret Manager service, which can be provided using a Kubernetes secret. Alternatively, `gcp` pod identity provider is also supported for GCP Secret Manager using `podIdentity` inside `gcpSecretManager`.

```yaml
gcpSecretManager:                                     # Optional.
  secrets:                                            # Required.
    - parameter: {param-name-used-for-auth}           # Required.
      id: {secret-manager-secret-name}                # Required.
      version: {secret-manager-secret-name}           # Optional.
  podIdentity:                                        # Optional.
    provider: gcp                                     # Required.
  credentials:                                        # Optional.
    clientSecret:                                     # Required.
      valueFrom:                                      # Required.
        secretKeyRef:                                 # Required.
          name: {k8s-secret-with-gcp-iam-sa-secret}   # Required.
          key: {key-within-the-secret}                # Required.
```

### Pod Authentication Providers

Several service providers allow you to assign an identity to a pod. By using that identity, you can defer authentication to the pod & the service provider, rather than configuring secrets.

Currently we support the following:

```yaml
podIdentity:
  provider: none | azure-workload | aws | aws-eks | gcp               # Optional. Default: none
  identityId: <identity-id>                                           # Optional. Only used by azure & azure-workload providers.
  roleArn: <role-arn>                                                 # Optional. Only used by aws provider.
  identityOwner: keda|workload                                        # Optional. Only used by aws provider.
```

#### Azure Workload Identity

[**Azure AD Workload Identity**](https://github.com/Azure/azure-workload-identity) is the newer version of [**Azure AD Pod Identity**](https://github.com/Azure/aad-pod-identity). It lets your Kubernetes workloads access Azure resources using an
[**Azure AD Application**](https://docs.microsoft.com/en-us/azure/active-directory/develop/app-objects-and-service-principals)
without having to specify secrets, using [federated identity credentials](https://azure.github.io/azure-workload-identity/docs/topics/federated-identity-credential.html) - *Don't manage secrets, let Azure AD do the hard work*.

You can tell KEDA to use Azure AD Workload Identity via `podIdentity.provider`.

```yaml
podIdentity:
  provider: azure-workload  # Optional. Default: none
  identityId: <identity-id> # Optional. Default: ClientId From annotation on service-account.
```

Azure AD Workload Identity will give access to pods with service accounts having appropriate labels and annotations. Refer
to these [docs](https://azure.github.io/azure-workload-identity/docs/topics/service-account-labels-and-annotations.html) for more information. You can set these labels and annotations on the KEDA Operator service account. This can be done for you during deployment with Helm with the
following flags -

1. `--set podIdentity.azureWorkload.enabled=true`
2. `--set podIdentity.azureWorkload.clientId={azure-ad-client-id}`
3. `--set podIdentity.azureWorkload.tenantId={azure-ad-tenant-id}`

Setting `podIdentity.azureWorkload.enabled` to `true` is required for workload identity authentication to work. For KEDA to get access to the provided client id federated credential has to be configured on the target Managed Identity / Azure AD application. Refer to these [docs](https://azure.github.io/azure-workload-identity/docs/topics/federated-identity-credential.html). Federated credential should use this subject (if KEDA is installed in `keda` namespace): `system:serviceaccount:keda:keda-operator`.

You can override the identity that was assigned to KEDA during installation, by specifying an `identityId` parameter under the `podIdentity` field. This allows end-users to use different identities to access various resources which is more secure than using a single identity that has access to multiple resources. In the case of override federated credentials should be configured for each of the used identities.

### Aws Secret Manager(s)

You can integrate AWS Secret Manager secrets into your trigger by configuring the `awsSecretManager` key in your KEDA scaling specification.

The `podIdentity` section configures the usage of AWS pod identity with the provider set to AWS.

The `credentials` section specifies AWS credentials, including the `accessKey` and `secretAccessKey`.

- **accessKey:** Configuration for the AWS access key.
- **secretAccessKey:** Configuration for the AWS secret access key.

The `region` parameter is optional and represents the AWS region where the secret resides, defaulting to the default region if not specified.

The `secrets` list within `awsSecretManager` defines the mapping between the AWS Secret Manager secret and the authentication parameter used in your application, including the parameter name, AWS Secret Manager secret name, and an optional version parameter, defaulting to the latest version if unspecified.

```yaml
awsSecretManager:
  podIdentity:                                     # Optional.
    provider: aws                                  # Required.
  credentials:                                     # Optional.
    accessKey:                                     # Required.
      valueFrom:                                   # Required.
        secretKeyRef:                              # Required.
          name: {k8s-secret-with-aws-credentials}  # Required.
          key: AWS_ACCESS_KEY_ID                   # Required.
    accessSecretKey:                               # Required.
      valueFrom:                                   # Required.
        secretKeyRef:                              # Required.
          name: {k8s-secret-with-aws-credentials}  # Required.
          key: AWS_SECRET_ACCESS_KEY               # Required.
  region: {aws-region}                             # Optional.
  secrets:                                         # Required.
  - parameter: {param-name-used-for-auth}          # Required.
    name: {aws-secret-name}                        # Required.
    version: {aws-secret-version}                  # Optional.
```

#### AWS Pod Identity Webhook for AWS

[**AWS IAM Roles for Service Accounts (IRSA) Pod Identity Webhook**](https://github.com/aws/amazon-eks-pod-identity-webhook) ([documentation](https://aws.amazon.com/blogs/opensource/introducing-fine-grained-iam-roles-service-accounts/)) allows you to provide the role name using an annotation on a service account associated with your pod.

You can tell KEDA to use EKS Pod Identity Webhook via `podIdentity.provider`.

```yaml
podIdentity:
  provider: aws # Optional. Default: none
  roleArn: <role-arn> # Optional. 
  identityOwner: keda|workload # Optional.
```

#### AWS EKS Pod Identity Webhook

> [DEPRECATED: This will be removed in KEDA v3](https://github.com/kedacore/keda/discussions/5343)

[**EKS Pod Identity Webhook**](https://github.com/aws/amazon-eks-pod-identity-webhook), which is described more in depth [here](https://aws.amazon.com/blogs/opensource/introducing-fine-grained-iam-roles-service-accounts/), allows you to provide the role name using an annotation on a service account associated with your pod.

You can tell KEDA to use EKS Pod Identity Webhook via `podIdentity.provider`.

```yaml
podIdentity:
  provider: aws-eks # Optional. Default: none
```
