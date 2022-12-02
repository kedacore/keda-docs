+++
title = "Azure Event Hubs"
availability = "v1.0+"
maintainer = "Microsoft"
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

You can authenticate by using pod identity or connection string authentication.

**Connection String Authentication:**

- `connection` - Connection string for the Azure Event Hubs Namespace.
  
  The following formats are supported.
  
  - With **SharedAccessKey** - `Endpoint=sb://<sb>.servicebus.windows.net/;SharedAccessKeyName=<key name>;SharedAccessKey=<key value>`
- `storageConnection` - Connection string for the Azure Storage Account used to store checkpoint information.

**Pod identity based authentication:**

[Azure AD Pod Identity](https://docs.microsoft.com/en-us/azure/aks/use-azure-ad-pod-identity) or [Azure AD Workload Identity](https://azure.github.io/azure-workload-identity/docs/) providers can be used.

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: nameOfTriggerAuth
  namespace: default
spec:
  podIdentity:
    provider: Azure
```

When you do so, the Event Hub scaler will depend on the existence of two configurations you have to provide: `eventHubNamespace` and `eventHubName`.


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
      storageConnectionFromEnv: AzureWebJobsStorage
      # Required if not using Pod Identity
      connectionFromEnv: EventHub
      # Required if using Pod Identity
      eventHubNamespace: AzureEventHubNameSpace
      eventHubName: NameOfTheEventHub
# Optional
      consumerGroup: $Default # default: $Default
      unprocessedEventThreshold: '64' # default 64 events.
      blobContainer: ehcontainer
```
