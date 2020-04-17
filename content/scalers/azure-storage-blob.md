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

This specification describes the `azure-blob` trigger for Azure Blob Storage. It scales based on the count of blobs in a given blob storage container and assumes the worker is responsible for clearing the container by delete/move the blobs once the blob processing completed.

```yaml
triggers:
- type: azure-blob
  metadata:
    blobContainerName: functions-blob # Required: Name of Azure Blob Storage container
    blobCount: '5' # Optional. Amount of blobs to scale out on. Default: 5 blobs 
    connection: STORAGE_CONNECTIONSTRING_ENV_NAME # Optional if TriggerAuthentication defined with pod identity or connection string authentication.
    blobPrefix:  # Optional. Prefix for the Blob. Use this to specifiy sub path for the blobs if required. Default : ""
    blobDelimiter: # Optional. Delimiter for identifying the blob Prefix. Default: "/"
```

The `connection` value is the name of the environment variable your deployment uses to get the connection string. This is usually resolved from a `Secret V1` or a `ConfigMap V1` collections. `env` and `envFrom` are both supported.

### Authentication Parameters

You can authenticate by using pod identity or connection string authentication.

**Connection String Authentication:**

- `connection` - Connection string for Azure Storage Account

### Example

```yaml
apiVersion: keda.k8s.io/v1alpha1
kind: TriggerAuthentication
metadata:
  name: azure-blob-auth
spec:
  podIdentity:
    provider: azure
---
apiVersion: keda.k8s.io/v1alpha1
kind: ScaledObject
metadata:
  name: azure-blob-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    deploymentName: azureblob-function
  triggers:
  - type: azure-blob
    metadata:
      # Required
      blobContainerName: functionsblob
      # Optional
      blobCount: "5" # default 5
      blobPrefix: blobsubpath # Default : ""
      blobDelimiter: "/" # Default: "/"
    authenticationRef:
        name: azure-blob-auth # authenticationRef would need either podIdentity or define a connection parameter
```
