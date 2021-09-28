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
- `consumerGroup` - Consumer group of event hub consumer. (default: `$default`).
- `unprocessedEventThreshold` - Average target value to trigger scaling actions. (default: 64).
- `blobContainer` - Container name to store checkpoint. This is needed when a using an Event Hub application written in dotnet or java, and not an Azure function.

> 💡 The Azure Storage connection string is not compatible with connection string created from a Shared Access Signature.

### Authentication Parameters

The common way of authenticating to Azure Event Hub is by using the connection string. However, you can use [Pod Identity](https://azure.github.io/aad-pod-identity/docs/demo/standard_walkthrough/) if you host your cluster in Azure AKS, and if have configured it to support Pod Identity.

To use Pod Identity, you have to add a [TriggerAuthentication](https://keda.sh/docs/2.0/concepts/authentication/#re-use-credentials-and-delegate-auth-with-triggerauthentication) and configure it to use Pod Identity like so:

```
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
