+++
title = "Azure Storage Queue"
availability = "v1.0+"
maintainer = "Microsoft"
category = "Messaging"
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
    activationQueueLength: '50'
    connectionFromEnv: STORAGE_CONNECTIONSTRING_ENV_NAME
    accountName: storage-account-name
    cloud: AzureUSGovernmentCloud
```

**Parameter list:**

- `queueName` - Name of the queue.
- `queueLength` - Target value for queue length passed to the scaler. Example: if one pod can handle 10 messages, set the queue length target to 10. If the actual number of messages in the queue is 30, the scaler scales to 3 pods. (Default: `5`, Optional)
- `activationQueueLength` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)
- `connectionFromEnv` - Name of the environment variable your deployment uses to get the connection string.
- `accountName` - Name of the storage account that the queue belongs to.
- `cloud` - Name of the cloud environment that the queue belongs to. Must be a known Azure cloud environment, or `Private` for Azure Stack Hub or Air Gapped clouds. (valid values: `AzurePublicCloud`, `AzureUSGovernmentCloud`, `AzureChinaCloud`, `AzureGermanCloud`, `Private`; default: `AzurePublicCloud`)

When `cloud` is set to `Private`, the `endpointSuffix` parameter is required. Otherwise, it is automatically generated based on the cloud environment. `endpointSuffix` represents the storage queue endpoint suffix of the cloud environment that the queue belongs to, e.g. `queue.core.windows.net` for `AzurePublicCloud`.

### Authentication Parameters

You can authenticate by using pod identity or connection string authentication.

**Connection String Authentication:**

- `connection` - Connection string for Azure Storage Account.

**Pod identity based authentication:**

[Azure AD Pod Identity](https://docs.microsoft.com/en-us/azure/aks/use-azure-ad-pod-identity) or [Azure AD Workload Identity](https://azure.github.io/azure-workload-identity/docs/) providers can be used.

### Example

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: azure-queue-auth
spec:
  podIdentity:
    provider: azure | azure-workload
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
      # Optional, required when pod identity is used
      accountName: storage-account-name
      # Optional: connection OR authenticationRef that defines connection
      connectionFromEnv: STORAGE_CONNECTIONSTRING_ENV_NAME # Default: AzureWebJobsStorage. Reference to a connection string in deployment
      # or authenticationRef as defined below
      #
      # Optional
      queueLength: "5" # default 5
      cloud: Private
      endpointSuffix: queue.local.azurestack.external # Required when cloud=Private
    authenticationRef:
        name: azure-queue-auth # authenticationRef would need either podIdentity or define a connection parameter
```
