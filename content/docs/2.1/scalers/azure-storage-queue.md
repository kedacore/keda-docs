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
    queueName: orders
    queueLength: '5'
    connectionFromEnv: STORAGE_CONNECTIONSTRING_ENV_NAME
```

**Parameter list:**

- `queueName` - Name of the queue.
- `queueLength` - Average target value to trigger scaling actions. (default: 5)
- `connectionFromEnv` - Name of the environment variable your deployment uses to get the connection string.

### Authentication Parameters

You can authenticate by using pod identity or connection string authentication.

**Connection String Authentication:**

- `connection` - Connection string for Azure Storage Account

### Example

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: azure-queue-auth
spec:
  podIdentity:
    provider: azure
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: azure-queue-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: azurequeue-function
  triggers:
  - type: azure-queue
    metadata:
      # Required
      queueName: functionsqueue
      # Required: connection OR authenticationRef that defines connection
      connectionFromEnv: STORAGE_CONNECTIONSTRING_ENV_NAME # Default: AzureWebJobsStorage. Reference to a connection string in deployment
      # or authenticationRef as defined below
      #
      # Optional
      queueLength: "5" # default 5
    authenticationRef:
        name: azure-queue-auth # authenticationRef would need either podIdentity or define a connection parameter
```
