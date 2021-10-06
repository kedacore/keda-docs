+++
title = "Azure Event Hubs"
layout = "scaler"
availability = "v1.0+"
maintainer = "Community"
description = "Scale applications based on Azure Event Hubs."
notice = "As of now, the Event Hub scaler only supports reading checkpoints from Blob Storage, as well as scaling only Event Hub applications written in C#, Java, Python or created with Azure Functions."
go_file = "azure_eventhub_scaler"
+++

### Trigger Specification

This specification describes the `azure-eventhub` trigger for Azure Event Hubs.

```yaml
triggers:
- type: azure-eventhub
  metadata:
    connectionFromEnv: EVENTHUB_CONNECTIONSTRING_ENV_NAME
    storageConnectionFromEnv: STORAGE_CONNECTIONSTRING_ENV_NAME
    consumerGroup: $Default
    unprocessedEventThreshold: '64'
    blobContainer: 'name_of_container'
```

**Parameter list:**

- `connectionFromEnv` - Name of the environment variable your deployment uses to get the connection string appended with `EntityPath=<event_hub_name>`.
- `storageConnectionFromEnv` - Name of the environment variable that provides connection string for Azure Storage Account to store checkpoint. As of now the Event Hub scaler only reads from Azure Blob Storage.
- `consumerGroup` - Consumer group of event hub consumer. (Default: `$default`, Optional)
- `unprocessedEventThreshold` - Average target value to trigger scaling actions. (Default: `64`, Optional)
- `blobContainer` - Container name to store checkpoint. This is needed when a using an Event Hub application written in dotnet or java, and not an Azure function.

> 💡 The Azure Storage connection string is not compatible with connection string created from a Shared Access Signature.

### Authentication Parameters

Not supported yet.

### Example

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: azure-eventhub-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: azureeventhub-function
  triggers:
  - type: azure-eventhub
    metadata:
      # Required
      connectionFromEnv: EventHub
      storageConnectionFromEnv: AzureWebJobsStorage
      # Optional
      consumerGroup: $Default # default: $Default
      unprocessedEventThreshold: '64' # default 64 events.
      blobContainer: ehcontainer
```
