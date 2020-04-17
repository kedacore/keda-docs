+++
title = "Azure Storage Queue"
layout = "scaler"
availability = "v1.0+"
maintainer = "Microsoft"
description = "Scale applications based on Azure Storage Queues."
go_file = "azure_queue_scaler"
+++

### Trigger Specification

This specification describes the `azure-queue` trigger for Azure Storage Queue.

```yaml
triggers:
- type: azure-queue
  metadata:
    queueName: functionsqueue
    queueLength: '5' # Optional. Queue length target for HPA. Default: 5 messages
    connection: STORAGE_CONNECTIONSTRING_ENV_NAME
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
  name: azure-queue-auth
spec:
  podIdentity:
    provider: azure
---
apiVersion: keda.k8s.io/v1alpha1
kind: ScaledObject
metadata:
  name: azure-queue-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    deploymentName: azurequeue-function
  triggers:
  - type: azure-queue
    metadata:
      # Required
      queueName: functionsqueue
      # Required: connection OR authenticationRef that defines connection
      connection: STORAGE_CONNECTIONSTRING_ENV_NAME # Default: AzureWebJobsStorage. Reference to a connection string in deployment
      # or authenticationRef as defined below
      #
      # Optional
      queueLength: "5" # default 5
    authenticationRef:
        name: azure-queue-auth # authenticationRef would need either podIdentity or define a connection parameter
```
