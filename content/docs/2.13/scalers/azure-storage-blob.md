+++
title = "Azure Blob Storage"
availability = "v1.1+"
maintainer = "Microsoft"
description = "Scale applications based on the count of blobs in a given Azure Blob Storage container."
notice = "As of now, this Azure Blob Storage scaler scales based on the count of the blobs in a container as opposed to the Azure Functions behavior where code is only triggered on new blobs."
go_file = "azure_blob_scaler"
+++

### Trigger Specification

This specification describes the `azure-blob` trigger for Azure Blob Storage. It scales based on the count of blobs in a given blob storage container and assumes the worker is responsible for clearing the container by deleting/moving the blobs once the blob processing completed.

```yaml
triggers:
- type: azure-blob
  metadata:
    blobContainerName: functions-blob
    blobCount: '5'
    activationBlobCount: '50'
    connectionFromEnv: STORAGE_CONNECTIONSTRING_ENV_NAME
    accountName: storage-account-name
    blobPrefix: myprefix
    blobDelimiter: /example
    cloud: Private
    endpointSuffix: blob.core.airgap.example # Required when cloud=Private
    recursive: false
    globPattern: glob-pattern
```

**Parameter list:**

- `blobContainerName` - Name of container in an Azure Storage account.
- `blobCount` - Average target value to trigger scaling actions. (Default: `5`, Optional)
- `activationBlobCount` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional)
- `connectionFromEnv` - Name of the environment variable your deployment uses to get the connection string.
- `accountName` - Name of the storage account that the container belongs to.
- `blobPrefix` - Prefix for the Blob. Use this to specify sub path for the blobs if required. (Default: `""`, Optional)
- `blobDelimiter` - Delimiter for identifying the blob prefix. (Default: `/`, Optional)
- `cloud` - Name of the cloud environment that the blob belongs to. Must be a known Azure cloud environment, or `Private` for Azure Stack Hub or Air Gapped clouds. (valid values: `AzurePublicCloud`, `AzureUSGovernmentCloud`, `AzureChinaCloud`, `AzureGermanCloud`, `Private`; default: `AzurePublicCloud`)
- `recursive` - Indicates whether or not blobs should be counted recursively. (Values: `true`, `false`, Default: `false`, Optional, Equivalent to setting `blobDelimiter` as `""`)
- `globPattern` - Glob pattern for blob names. The scaler will count all blobs whose names match the pattern
as metric value. (Default: `""`, Optional, The `blobPrefix`, `blobDelimiter` and `recursive` parameters are ignored when this is specified.)

When `cloud` is set to `Private`, the `endpointSuffix` parameter is required. Otherwise, it is automatically generated based on the cloud environment. `endpointSuffix` represents the storage blob endpoint suffix of the cloud environment that the blob belongs to, e.g. `blob.core.cloudapi.de` for `AzureGermanCloud`.


### Authentication Parameters

You can authenticate by using pod identity or connection string authentication.

**Connection String Authentication:**

- `connection` - Connection string for Azure Storage Account.

  The following formats are supported.

  - **Shared Key authentication** - `DefaultEndpointsProtocol=https;AccountName=<accountName>;AccountKey=<accountKey>;EndpointSuffix=<endpointSuffix>`
  - **Shared access signature** (SAS) - `BlobEndpoint=<blobEndpoint>;SharedAccessSignature=<sasToken>`

**Pod Identity Authentication**

[Azure AD Pod Identity](https://docs.microsoft.com/en-us/azure/aks/use-azure-ad-pod-identity) or [Azure AD Workload Identity](https://azure.github.io/azure-workload-identity/docs/) providers can be used.

- `accountName` - Name of the Azure Storage Account.

### Example

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: azure-blob-auth
spec:
  podIdentity:
    provider: azure | azure-workload
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: azure-blob-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: azureblob-function
  triggers:
  - type: azure-blob
    metadata:
      # Required
      blobContainerName: functionsblob
      # Optional, required when pod identity is used
      accountName: storage-account-name
      # Optional, connection OR authenticationRef that defines the connection
      connectionFromEnv: STORAGE_CONNECTIONSTRING_ENV_NAME # Reference to a connection string in deployment
      # or authenticationRef as defined below
      #
      # Optional
      blobCount: "5" # default 5
      blobPrefix: blobsubpath # Default : ""
      blobDelimiter: "/" # Default: "/"
      # Optional, default: AzurePublicCloud
      cloud: AzureChinaCloud
    authenticationRef:
        name: azure-blob-auth # authenticationRef would need either podIdentity or define a connection parameter
```
