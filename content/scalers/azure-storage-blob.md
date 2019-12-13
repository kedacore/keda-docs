+++
fragment = "content"
weight = 100
title = "Azure Storage Blob"
background = "light"
+++

Scale applications based on Azure Storage Blobs.

<!--more-->

### Trigger Specification

This specification describes the `azure-blob` trigger for Azure Storage Blob.

```yaml
triggers:
  - type: azure-blob
    metadata:
      containerName: functions-blob # Required: Container name
      blobCount: '5' # Optional. Amount of blobs to scale out on. Default: 5 blobs 
      connection: STORAGE_CONNECTIONSTRING_ENV_NAME
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
  labels:
    deploymentName: azureblob-function
spec:
  scaleTargetRef:
    deploymentName: azureblob-function
  triggers:
  - type: azure-blob
    metadata:
      # Required
      containerName: functionsblob
      # Required: connection OR authenticationRef that defines connection
      connection: STORAGE_CONNECTIONSTRING_ENV_NAME # Default: AzureWebJobsStorage. Reference to a connection string in deployment
      # or authenticationRef as defined below
      #
      # Optional
      blobCount: "5" # default 5
      blobPrefix:  # Default : ""
      blobDelimiter: # Default: "/"
    authenticationRef:
        name: azure-blob-auth # authenticationRef would need either podIdentity or define a connection parameter
```
