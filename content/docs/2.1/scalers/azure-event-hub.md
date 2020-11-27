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
    connectionFromEnv: EVENTHUB_CONNECTIONSTRING_ENV_NAME # Connection string for Event Hub namespace appended with "EntityPath=<event_hub_name>"
    storageConnectionFromEnv: STORAGE_CONNECTIONSTRING_ENV_NAME # Connection string for account used to store checkpoint. As of now the Event Hub scaler only reads from Azure Blob Storage.
    consumerGroup: $Default # Optional. Consumer group of event hub consumer. Default: $Default
    unprocessedEventThreshold: '64' # Optional. Target number of unprocessed events across all partitions in Event Hub for HPA. Default: 64 events.
    blobContainer: 'name_of_container' # Optional. Container name to store checkpoint. This is needed when a using an Event Hub application written in dotnet or java, and not an Azure function.
```

The `connectionFromEnv` value is the name of the environment variable your deployment uses to get the Event Hub connection string which is appended with the Event Hub name using Entity Path variable. storageConnectionFromEnv` is the name of the environment variable your deployment uses to get the Storage connection string.

Environment variables are usually resolved from a `Secret V1` or a `ConfigMap V1` collections. `env` and `envFrom` are both supported.

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
