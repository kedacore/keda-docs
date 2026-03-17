+++
title = "Azure Cosmos DB Change Feed"
availability = "v2.20+"
maintainer = "Microsoft"
category = "Messaging"
description = "Scale applications based on Azure Cosmos DB change feed processor lag."
go_file = "azure_cosmosdb_scaler"
+++

### Trigger Specification

This specification describes the `azure-cosmosdb` trigger for Azure Cosmos DB Change Feed. It estimates the lag of a change feed processor by comparing the current position of the change feed with the processor's checkpoint (stored in a lease container), and scales based on the number of partitions that have unprocessed changes.

```yaml
triggers:
- type: azure-cosmosdb
  metadata:
    databaseId: mydb
    containerId: mycontainer
    leaseDatabaseId: mydb
    leaseContainerId: leases
    processorName: myprocessor
    connectionFromEnv: COSMOS_CONNECTION
    lagThreshold: '1'
    activationLagThreshold: '0'
```

**Parameter list:**

- `databaseId` - ID of the Cosmos DB database containing the monitored container.
- `containerId` - ID of the monitored container (the data container).
- `leaseDatabaseId` - ID of the Cosmos DB database containing the lease container.
- `leaseContainerId` - ID of the lease container used by the change feed processor.
- `processorName` - Name of the change feed processor.
- `lagThreshold` - Target number of lagging partitions to trigger scaling. (Default: `1`, Optional)
- `activationLagThreshold` - Minimum number of lagging partitions to activate the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)
- `connection` - Connection string for the Cosmos DB account containing the monitored container. (Optional, see authentication)
- `leaseConnection` - Connection string for the Cosmos DB account containing the lease container. If not specified, defaults to `connection`. (Optional)
- `endpoint` - Account endpoint of the Cosmos DB account (for workload identity authentication). (Optional, see authentication)
- `leaseEndpoint` - Account endpoint of the Cosmos DB account containing the lease container. If not specified, defaults to `endpoint`. (Optional)
- `cosmosDBKey` - Account key for the Cosmos DB account. Required when using `endpoint` without workload identity. (Optional)
- `leaseCosmosDBKey` - Account key for the Cosmos DB account containing the lease container. If not specified, defaults to `cosmosDBKey`. (Optional)

> 💡 **Note:** The scaler supports lease documents written by both the .NET SDK and Java SDK change feed processors, including both PK-range-based (version 0) and EPK-range-based (version 1) lease formats.

### Authentication Parameters

You can authenticate by using connection string authentication or pod identity.

**Connection String Authentication:**

- `connection` - Connection string for the Cosmos DB account containing the monitored container. Format: `AccountEndpoint=https://<account>.documents.azure.com:443/;AccountKey=<key>`.
- `leaseConnection` - Connection string for the Cosmos DB account containing the lease container. Defaults to `connection` if not specified.

Alternatively, provide `endpoint` + `cosmosDBKey`:

- `endpoint` - Cosmos DB account endpoint (e.g., `https://myaccount.documents.azure.com:443/`).
- `cosmosDBKey` - Cosmos DB account key.

**Pod identity based authentication:**

[Azure AD Workload Identity](https://azure.github.io/azure-workload-identity/docs/) provider can be used.

When using workload identity, provide `endpoint` (and optionally `leaseEndpoint`) instead of connection strings. The scaler will acquire a bearer token using the workload identity credential chain.

> 💡 The identity used must have appropriate permissions to read from both the monitored container's change feed and the lease container. The built-in `Cosmos DB Account Reader` role or a custom role with `Microsoft.DocumentDB/databaseAccounts/readMetadata` and data-plane read access is required.

### How It Works

The scaler estimates change feed processor lag using the same algorithm as the .NET SDK's `ChangeFeedEstimator` and Java SDK's `IncrementalChangeFeedProcessorImpl`:

1. Queries the lease container for all lease documents
2. For each lease (partition), reads the change feed with `maxItemCount=1` starting from the lease's continuation token
3. Compares the session token LSN (latest sequence number) with the first returned item's `_lsn`
4. Calculates lag as `sessionLSN - firstItemLSN + 1`
5. Counts partitions with lag > 0 as the scaling metric

Reading the change feed is a **non-destructive** operation — it does not affect the change feed processor's checkpoints or consume any data.

If a partition split (HTTP 410 Gone) is detected, the scaler automatically retries once with fresh lease data.

### Example

**Using connection string authentication:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cosmos-secrets
  namespace: default
data:
  connection: <base64-encoded-connection-string>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: cosmos-trigger-auth
  namespace: default
spec:
  secretTargetRef:
    - parameter: connection
      name: cosmos-secrets
      key: connection
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: cosmos-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: my-change-feed-processor
  pollingInterval: 10
  minReplicaCount: 0
  maxReplicaCount: 8
  cooldownPeriod: 30
  triggers:
  - type: azure-cosmosdb
    metadata:
      # Required
      databaseId: mydb
      containerId: mycontainer
      leaseDatabaseId: mydb
      leaseContainerId: leases
      processorName: myprocessor
      # Optional
      lagThreshold: "1"       # default 1
      activationLagThreshold: "0"  # default 0
    authenticationRef:
      name: cosmos-trigger-auth
```

**Using Azure Workload Identity:**

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: cosmos-workload-auth
  namespace: default
spec:
  podIdentity:
    provider: azure-workload
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: cosmos-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: my-change-feed-processor
  triggers:
  - type: azure-cosmosdb
    metadata:
      endpoint: https://myaccount.documents.azure.com:443/
      databaseId: mydb
      containerId: mycontainer
      leaseDatabaseId: mydb
      leaseContainerId: leases
      processorName: myprocessor
    authenticationRef:
      name: cosmos-workload-auth
```
