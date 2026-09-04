+++
title = "Azure Cosmos DB Change Feed"
availability = "v2.21+"
maintainer = "Microsoft"
category = "Data & Storage"
description = "Scale applications based on Azure Cosmos DB change feed processor lag."
go_file = "azure_cosmosdb_scaler"
+++

### Trigger Specification

This specification describes the `azure-cosmosdb` trigger for Azure Cosmos DB Change Feed. It estimates the transaction lag of a change feed processor by comparing the current position of each physical partition with the processor's checkpoint in the lease container.

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
    changeFeedLagThreshold: '100'
    activationChangeFeedLagThreshold: '0'
  metricType: AverageValue
```

**Parameter list:**

- `databaseId` - ID of the Cosmos DB database containing the monitored container.
- `containerId` - ID of the monitored container (the data container).
- `leaseDatabaseId` - ID of the Cosmos DB database containing the lease container.
- `leaseContainerId` - ID of the lease container used by the change feed processor.
- `processorName` - Name of the change feed processor. The scaler reads only lease documents whose IDs start with `<processorName>.`, allowing multiple processors to share a lease container.
- `changeFeedLagThreshold` - Target transaction lag per replica. Must be greater than `0`. (Default: `100`, Optional)
- `activationChangeFeedLagThreshold` - Total transaction lag required to activate the scaler from zero. Must be greater than or equal to `0` and less than `changeFeedLagThreshold`. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)
- `connectionFromEnv` - Name of an environment variable in the scale target that contains the data account connection string. (Optional)
- `leaseConnectionFromEnv` - Name of an environment variable in the scale target that contains the lease account connection string. (Optional)
- `cosmosDBKeyFromEnv` - Name of an environment variable in the scale target that contains the data account key. (Optional)
- `leaseCosmosDBKeyFromEnv` - Name of an environment variable in the scale target that contains the lease account key. (Optional)
- `cloud` - Azure cloud used to resolve the token authority and Cosmos DB resource scope. (Values: `AzurePublicCloud`, `AzureUSGovernmentCloud`, `AzureChinaCloud`, `AzureGermanCloud`, `Private`, Default: `AzurePublicCloud`, Optional)
- `cosmosDBResourceURL` - Cosmos DB resource URL used to request bearer tokens. It is user-configurable and required only when `cloud` is `Private`. (Optional)
- `activeDirectoryEndpoint` - Microsoft Entra authority endpoint. It is user-configurable and required only for service-principal authentication when `cloud` is `Private`. (Optional)

> 💡 **Note:** The scaler supports lease documents written by both the .NET SDK and Java SDK change feed processors, including both PK-range-based (version 0) and EPK-range-based (version 1) lease formats.

### Authentication Parameters

The following parameters may be provided through `TriggerAuthentication` (they are also accepted in `triggerMetadata`, but sensitive values should be sourced from a secret):

**Connection string authentication:**

- `connection` - Connection string for the data account. Format: `AccountEndpoint=https://<account>.documents.azure.com:443/;AccountKey=<key>`.
- `leaseConnection` - Connection string for the lease account. Defaults to `connection` when neither `leaseConnection` nor `leaseEndpoint` is set.

**Account key authentication:**

- `endpoint` - Endpoint of the data account. Required when a connection string is not used.
- `leaseEndpoint` - Endpoint of the lease account. When neither this nor `leaseConnection` is set, the lease account inherits the data account configuration.
- `cosmosDBKey` - Account key for the data account. Used with `endpoint`.
- `leaseCosmosDBKey` - Account key used with an explicitly configured `leaseEndpoint`. When the entire lease account configuration is inherited, the data account key is inherited with it.

**Service-principal authentication:**

- `tenantId` - Microsoft Entra tenant ID.
- `clientId` - Microsoft Entra application ID.
- `clientSecret` - Microsoft Entra application secret.

---

The data and lease containers can be in the same account or separate accounts. If `leaseConnection` and `leaseEndpoint` are both omitted, the lease account inherits the data account connection string or the data endpoint and key. To use separate accounts, configure `leaseConnection` or `leaseEndpoint` and the corresponding lease credentials.

The scaler selects credentials independently for the data and lease accounts:

1. A connection string takes precedence over the corresponding endpoint and account key.
2. Without a connection string, an account key is used when one is supplied for that endpoint.
3. An endpoint without an account key uses a bearer token. Azure Workload Identity takes precedence when configured; otherwise, all three service-principal values (`tenantId`, `clientId`, and `clientSecret`) are required.

This allows one account to use an account key while the other uses bearer-token authentication. When both accounts resolve to account keys, configured bearer-token credentials are not used.

Account keys and connection strings can also be sourced from scale-target environment variables using `cosmosDBKeyFromEnv`, `leaseCosmosDBKeyFromEnv`, `connectionFromEnv`, and `leaseConnectionFromEnv`; `TriggerAuthentication` values take precedence over environment variables.

**Azure Workload Identity authentication:**

[Azure Workload Identity](../authentication-providers/azure-ad-workload-identity.md) can be used with `endpoint` and, for a separate lease account, `leaseEndpoint`. The workload identity is used for every endpoint that does not have an account key. Service-principal parameters are ignored when workload identity is configured.

For both bearer-token methods, the identity needs Cosmos DB data-plane permission to read the monitored container's change feed and query the lease container.

#### Sovereign and private clouds

The `cloud` setting affects bearer-token authentication only; account endpoints must still be supplied through connection strings or `endpoint` and `leaseEndpoint`.

For a known sovereign cloud, the scaler resolves the Microsoft Entra authority for service-principal authentication and the Cosmos DB resource URL from KEDA's Azure environment configuration. The token scope is that resource URL with `/.default` appended. For `cloud: Private`, set `cosmosDBResourceURL` to the token resource for both service-principal and workload identity authentication. This parameter is not used to override the resource URL for known clouds. Also set `activeDirectoryEndpoint` when using a service principal.

For workload identity, the authority host comes from the workload identity configuration, such as the `AZURE_AUTHORITY_HOST` environment variable injected by the webhook; `activeDirectoryEndpoint` trigger metadata is not used.

### How It Works

The scaler estimates lag using the same LSN-based approach as the .NET SDK `ChangeFeedEstimator` and the Java SDK incremental change feed processor:

1. Query lease documents whose IDs start with `<processorName>.`.
2. For each lease, read at most one change feed item from its continuation token.
3. Treat `304 Not Modified` or an empty result as zero lag for that partition.
4. Otherwise, calculate the partition lag as `sessionLSN - firstItemLSN + 1`.
5. Sum lag across partitions whose lag is greater than zero.

The total is an estimate of pending **transactions**, not an exact item count. A normal single-item write is one transaction, while all item operations committed in one Cosmos DB transactional batch share a transaction boundary and therefore contribute one unit of LSN-based lag.

Reading the change feed is non-destructive: it does not change processor checkpoints or consume data.

#### Active-partition scaling cap

The scaler counts only partitions with lag greater than zero as active. Before publishing the metric, it caps the total lag to:

`min(totalLag, activePartitions * changeFeedLagThreshold)`

With the default `AverageValue` metric type, this gives the strict desired-replica calculation:

`min(activePartitions, ceil(totalLag / changeFeedLagThreshold))`

This prevents scaling beyond the number of partitions from which processor replicas can concurrently acquire work. A single hot partition therefore scales to at most one replica from this trigger, even when its lag is much larger than the threshold; additional replicas cannot process that physical partition concurrently. If more parallelism is required, distribute writes across more partition-key values or otherwise address the hot partition.

Setting the trigger's `metricType` explicitly to `Value` is supported, but the partition cap is only best-effort because the HPA's `Value` calculation also depends on the current replica count. Use the default `AverageValue` for the strict active-partition cap. HPA behavior, `minReplicaCount`, `maxReplicaCount`, and other triggers can further constrain the final replica count.

#### Partition splits

Only HTTP `410 Gone` with Cosmos DB substatus `1002` is treated as a partition split with a stale parent lease. The scaler performs one complete lease refresh and retries lag estimation once. Other `410` substatuses are errors.

If the refreshed leases still contain the stale parent and no other lag is present, the scaler emits `activationChangeFeedLagThreshold + 1` and treats exactly one partition as active. This wakes exactly one processor replica from zero so it can replace the stale parent lease with child leases. When other lagging partitions exist, split recovery raises the metric above the activation threshold only if needed and does not add another active partition to the cap.

### Error Handling

Lease-query, change-feed, authentication, network, and response-parsing failures for a processed lease are returned to KEDA. The scaler does not cache a previous partition count or synthesize a scale-out metric after an error, and a failure while processing one valid lease fails that polling cycle instead of returning a partial total. Documents that cannot be decoded as leases or that lack a lease token or continuation token are ignored as non-lease metadata. Configure [`fallback`](../reference/scaledobject-spec/#fallback) on the `ScaledObject` for explicit sustained-failure behavior.

### Examples

#### Connection string authentication

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cosmos-secrets
  namespace: default
stringData:
  connection: AccountEndpoint=https://myaccount.documents.azure.com:443/;AccountKey=<account-key>
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
      databaseId: mydb
      containerId: mycontainer
      leaseDatabaseId: mydb
      leaseContainerId: leases
      processorName: myprocessor
      changeFeedLagThreshold: '100'
      activationChangeFeedLagThreshold: '0'
    authenticationRef:
      name: cosmos-trigger-auth
```

#### Azure Workload Identity

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

#### Service-principal authentication

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cosmos-service-principal
  namespace: default
stringData:
  tenantId: <tenant-id>
  clientId: <client-id>
  clientSecret: <client-secret>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: cosmos-service-principal-auth
  namespace: default
spec:
  secretTargetRef:
    - parameter: tenantId
      name: cosmos-service-principal
      key: tenantId
    - parameter: clientId
      name: cosmos-service-principal
      key: clientId
    - parameter: clientSecret
      name: cosmos-service-principal
      key: clientSecret
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
      name: cosmos-service-principal-auth
```
