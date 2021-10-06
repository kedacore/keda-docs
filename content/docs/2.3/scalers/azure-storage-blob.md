+++
title = "Azure Blob Storage"
layout = "scaler"
availability = "v1.1+"
maintainer = "Community"
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
    connectionFromEnv: STORAGE_CONNECTIONSTRING_ENV_NAME
    accountName: storage-account-name
    blobPrefix: myprefix
    blobDelimiter: /example
```

**Parameter list:**

- `blobContainerName` - Name of container in an Azure Storage account.
- `blobCount` - Average target value to trigger scaling actions. (Default: `5`, Optional)
- `connectionFromEnv` - Name of the environment variable your deployment uses to get the connection string.
- `accountName` - Name of the storage account that the container belongs to.
- `blobPrefix` - Prefix for the Blob. Use this to specify sub path for the blobs if required. (Default: `""`, Optional)
- `blobDelimiter` - Delimiter for identifying the blob prefix. (Default: `/`, Optional)

You can also optionally assign a name to the metric using the `metricName` value. If not specified, the `metricName` will be generated automatically based on of the `blobContainerName`, `blobPrefix` and `blobDelimiter`. For example: **azure-blob-functions-blob-myprefix-example**. If using more than one trigger it is required that all `metricName`(s) be unique. The value will be prefixed with `azure-blob-`.

### Authentication Parameters

You can authenticate by using pod identity or connection string authentication.

**Connection String Authentication:**

- `connection` - Connection string for Azure Storage Account.

**Pod Identity Authentication**

- `accountName` - Name of the Azure Storage Account.

### Example

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: azure-blob-auth
spec:
  podIdentity:
    provider: azure
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
    authenticationRef:
        name: azure-blob-auth # authenticationRef would need either podIdentity or define a connection parameter
```
