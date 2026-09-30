+++
title = "Azure Cosmos DB Change Feed"
availability = "v2.21+"
maintainer = "Microsoft"
category = "Data & Storage"
description = "Scale applications based on Azure Cosmos DB change feed processor lag."
go_file = "azure_cosmosdb_scaler"
+++

### Trigger Specification

This specification describes the `azure-cosmosdb` trigger for Azure Cosmos DB Change Feed. It estimates the transaction lag of a change feed processor from its checkpoints in the lease container.

Version-1 Effective Partition Key (EPK) leases, lease-capacity scaling, high-availability mode, and the diagnostic metrics described below are new in **KEDA v2.22 (unreleased)**. KEDA v2.21 supports legacy version-0 physical partition-range leases and lag-based scaling only.

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
- `activationChangeFeedLagThreshold` - Total transaction lag must be strictly greater than this value to activate the scaler from zero, except in high-availability mode or during split recovery. Must be greater than or equal to `0` and less than `changeFeedLagThreshold`. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)
- `maxActiveLeasesPerReplica` - Desired maximum number of active leases per replica for lease-capacity scaling. Must be a positive integer, for example `'4'`. With high availability enabled, the capacity calculation includes caught-up leases. Requires the trigger's `metricType` to be `AverageValue`. This is a scaling capacity target, not an SDK-enforced lease ownership limit. (Optional)
- `enableHighAvailability` - Retain lease-coverage capacity even when all leases are caught up. Requires `maxActiveLeasesPerReplica` to be configured. (Values: `true`, `false`, Default: `false`, Optional)
- `connectionFromEnv` - Name of an environment variable in the scale target that contains the data account connection string. (Optional)
- `leaseConnectionFromEnv` - Name of an environment variable in the scale target that contains the lease account connection string. (Optional)
- `cosmosDBKeyFromEnv` - Name of an environment variable in the scale target that contains the data account key. (Optional)
- `leaseCosmosDBKeyFromEnv` - Name of an environment variable in the scale target that contains the lease account key. (Optional)
- `cloud` - Azure cloud used to resolve the token authority and Cosmos DB resource scope. (Values: `AzurePublicCloud`, `AzureUSGovernmentCloud`, `AzureChinaCloud`, `AzureGermanCloud`, `Private`, Default: `AzurePublicCloud`, Optional)
- `cosmosDBResourceURL` - Cosmos DB resource URL used to request bearer tokens. It is user-configurable and required only when `cloud` is `Private`. (Optional)
- `activeDirectoryEndpoint` - Microsoft Entra authority endpoint. It is user-configurable and required only for service-principal authentication when `cloud` is `Private`. (Optional)

#### Supported lease formats

The scaler supports incremental change feed processor leases written by the .NET and Java SDKs:

| Lease format | Support | Routing |
|---|---|---|
| Version 0: physical partition-key range ID | KEDA v2.21+ | Uses the physical range ID from the lease token; existing behavior is unchanged. |
| Version 1: EPK range | New in KEDA v2.22 (unreleased) | Reads .NET `FeedRange.Range` or Java `feedRange.Range` and resolves the interval against current physical partition-key ranges. |

For v1 leases, an exact physical-range match is routed by the current physical range ID. A lease covering a subrange of one physical range also uses EPK filtering headers. An interval overlapping multiple physical ranges follows the `410/1002` [split-recovery path](#partition-splits), rather than being sent as a physical range ID. Java `ChangeFeedStateV1` continuation state is decoded to extract the nested server ETag; the Base64-encoded client state is not sent as the server continuation token.

Full-fidelity change feed and other unsupported state formats are not supported and fail where detected. Malformed lease ranges or continuation state are errors, not leases to silently skip.

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
2. For each lease, resolve its range and read at most one change feed item from its continuation position.
3. Treat `304 Not Modified` or an empty result as zero lag for that lease.
4. Otherwise, calculate the lease lag as `sessionLSN - firstItemLSN + 1`.
5. Sum lag across leases whose lag is greater than zero.

The total is an estimate of pending **transactions**, not an exact item count. A normal single-item write is one transaction, while all item operations committed in one Cosmos DB transactional batch share a transaction boundary and therefore contribute one unit of LSN-based lag. The LSN estimate remains approximate, particularly for EPK subranges and deletes; it is not an exact count of changes available to the processor.

Reading the change feed is non-destructive: it does not change processor checkpoints or consume data.

#### Default lag-based scaling

When `maxActiveLeasesPerReplica` is omitted and `enableHighAvailability` is `false`, existing scaling behavior is unchanged. A lease with estimated lag greater than zero is active. For the default scaling cap only, never-checkpointed active leases are collapsed to one bootstrap lease instead of being counted individually. Let `cappedActiveLeases` denote this adjusted count. The scaler publishes:

`min(totalLag, cappedActiveLeases * changeFeedLagThreshold)`

The external metric target remains `changeFeedLagThreshold`. With the default `AverageValue` metric type, the resulting desired-replica calculation before HPA constraints is:

`min(cappedActiveLeases, ceil(totalLag / changeFeedLagThreshold))`

This prevents this trigger from requesting more replicas than eligible leases. A single hot lease therefore requests at most one replica, even when its lag is much larger than the threshold; additional replicas cannot concurrently own that lease.

Setting the trigger's `metricType` explicitly to `Value` is supported only without lease-capacity scaling, but the cap is then best-effort because the HPA's `Value` calculation also depends on the current replica count.

#### Lease-capacity scaling and high availability

Configure `maxActiveLeasesPerReplica` to opt in to lease-capacity scaling. This mode requires `metricType: AverageValue`; `Value` is rejected. Define:

- `totalLag`: total estimated lag before scaling-cap or split-activation adjustments.
- `activeLeases`: actual number of leases with estimated lag greater than zero, including each never-checkpointed active lease individually.
- `totalLeases`: all processor leases, including caught-up leases.
- `eligibleLeases`: `activeLeases` normally, or `totalLeases` when `enableHighAvailability` is `true`.

The scaler calculates:

```text
Rlag      = ceil(totalLag / changeFeedLagThreshold)
Rcapacity = ceil(eligibleLeases / maxActiveLeasesPerReplica)
desired   = min(max(Rlag, Rcapacity), eligibleLeases)
```

The old bootstrap collapse does not apply to capacity mode. For example, with 12 active leases, total lag of 120, `changeFeedLagThreshold: '100'`, and `maxActiveLeasesPerReplica: '4'`, the lag calculation requests 2 replicas, the capacity calculation requests 3, and the result is 3. All 12 active leases count even if none has checkpointed yet.

In capacity mode, the external HPA metric target is **1**, and the reported metric is the computed desired replica count, not transaction lag. `changeFeedLagThreshold` still controls `Rlag`; use the separate diagnostics below to observe raw lag.

Without HA, activation still requires `totalLag > activationChangeFeedLagThreshold`; capacity alone does not bypass this threshold. With HA enabled, the scaler is active whenever `totalLeases > 0`, even if all leases are caught up. For example, 12 caught-up leases and capacity 4 request 3 replicas in HA mode, but 0 without HA. With no leases, either mode reports 0 and is inactive. Split recovery is an exception described below.

High availability here means retaining **lease-coverage capacity**, not redundant ownership or a redundancy guarantee for each lease. The change feed processor SDK still controls lease acquisition, balancing, and checkpointing. `maxActiveLeasesPerReplica` does not enforce an SDK ownership limit.

In either scaling mode, these calculations describe this trigger's recommendation, not an instant or exact replica-count guarantee. HPA tolerance, stabilization and scaling behavior, `minReplicaCount`, `maxReplicaCount`, and other triggers still affect the final replica count.

#### Partition splits

HTTP `410 Gone` with Cosmos DB substatus `1002` is treated as a partition split with a stale parent lease. An EPK lease overlapping multiple current physical ranges produces the same recovery signal. The scaler refreshes leases and partition ranges once and retries lag estimation once. Other `410` substatuses are errors.

If a stale parent remains after refresh, split recovery can activate the scaler and request at least one worker so the processor can replace parent leases with child leases. In default mode, when no other lag is present, the scaler emits `activationChangeFeedLagThreshold + 1` and uses one active lease for the cap. When other lagging leases exist, it raises the metric above the activation threshold only if needed without adding another lease to the default cap. Capacity mode preserves its target of 1 and reports a desired replica count with the recovery floor applied. HPA and ScaledObject constraints still apply.

### Diagnostic Metrics

The scaler exposes aggregate diagnostics through the existing scaler metric-value collectors: [`keda_scaler_metrics_value` in Prometheus](../integrations/prometheus.md) and the equivalent [OpenTelemetry metrics](../integrations/opentelemetry.md). Each diagnostic uses the existing scaler metric name with a suffix in the metric label, not a new per-lease label:

| Metric-name suffix | Value |
|---|---|
| `_total_lag` | Total estimated lag before scaling-cap and split-activation adjustments. |
| `_active_leases` | Actual active lease count, including individual never-checkpointed active leases without bootstrap collapse. |
| `_total_leases` | Total processor lease count, including caught-up leases. |
| `_lag_desired_replicas` | `ceil(totalLag / changeFeedLagThreshold)`, before the lease cap. |
| `_lease_capacity_desired_replicas` | `ceil(eligibleLeases / maxActiveLeasesPerReplica)` in capacity mode, before the lease cap; 0 when capacity mode is disabled. |

These are diagnostic series only, **not additional HPA scaling inputs**. The normal scaler metric remains capped lag in default mode or the computed desired replica count in capacity mode. Compare diagnostics to see whether lag or lease capacity drives the recommendation and whether the lease cap limits it.

On a failed poll, diagnostic values are recorded as `NaN`, not zero backlog or a successful cached result. Use KEDA's existing scaler error metrics and logs to investigate the failure.

### Error Handling

Lease-query, container or partition metadata, change-feed, authentication, network, and response-parsing failures are returned to KEDA. Invalid lease `FeedRange` or continuation state also fails the polling cycle; invalid leases are not silently skipped to produce a partial total. A never-checkpointed lease is not by itself an invalid lease.

Errors are not converted into zero backlog or a synthetic scale-out metric. KEDA's existing error handling and configured [`fallback`](../reference/scaledobject-spec.md#fallback) apply. For sustained metric failures, consider `spec.fallback` with `failureThreshold: 3` and `replicas: 2`, as shown below. The example uses `AverageValue`, which is compatible with fallback and required by capacity mode. Choose a fallback replica count for your own lease capacity and availability needs; fallback is not a fresh lease-count estimate.

### Examples

#### Lease capacity, high availability, and fallback

This example uses the connection-string `TriggerAuthentication` named `cosmos-trigger-auth` from the next example. Remove `enableHighAvailability` or set it to `'false'` to base capacity on active leases only. Remove both new options to retain default lag-based behavior.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: cosmos-capacity-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: my-change-feed-processor
  minReplicaCount: 0
  maxReplicaCount: 8
  fallback:
    failureThreshold: 3
    replicas: 2
  triggers:
  - type: azure-cosmosdb
    metricType: AverageValue
    metadata:
      databaseId: mydb
      containerId: mycontainer
      leaseDatabaseId: mydb
      leaseContainerId: leases
      processorName: myprocessor
      changeFeedLagThreshold: '100'
      activationChangeFeedLagThreshold: '0'
      maxActiveLeasesPerReplica: '4'
      enableHighAvailability: 'true'
    authenticationRef:
      name: cosmos-trigger-auth
```

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
