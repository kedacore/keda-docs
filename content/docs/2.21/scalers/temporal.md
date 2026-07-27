+++
title = "Temporal"
availability = "v2.17+"
maintainer = "Community"
description = "Scale applications based on Temporal task queue."
go_file = "temporal_scaler"
+++

### Trigger Specification

This specification describes the `temporal` trigger that scales based on a Temporal task queue.

```yaml
triggers:
  - type: temporal
    metadata:
      namespace: default
      taskQueue: "workflow_with_single_noop_activity:test"
      targetQueueSize: "2"
      activationTargetQueueSize: "0"
      endpoint: temporal-frontend.temporal.svc.cluster.local:7233
      queueTypes: workflow # optional
      workerDeploymentName: my-deployment # optional
      workerDeploymentBuildId: v1.0.0 # optional
      buildId: 1.0.0 # deprecated, use workerDeploymentBuildId
      selectAllActive: "false" # deprecated
      selectUnversioned: "false" # deprecated
      includeRunningWorkflowCount: "false" # optional
      workflowTaskQueueForCount: "" # optional
      minConnectTimeout: "5" # optional
      unsafeSsl: "false" # optional
      tlsServerName: "custom-tls-servername" # optional
```

**Parameter list:**

- `endpoint` - This parameter specifies the URL of the Temporal gRPC service. You need to provide the service address in the format `<hostname>:<port>`. (Required)
- `endpointFromEnv` - Defines the endpoint, similar to the `endpoint` parameter, but the value is read from an environment variable. (Optional)
- `namespace` - The namespace of the temporal service. (Default:`default`, Optional)
- `activationTargetQueueSize` - This sets the target value for activating the scaler. More information about activation thresholds can be found  [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)
- `targetQueueSize` - Target value for queue length passed to the scaler. The scaler will cause the replicas to increase if the queue message count is greater than the target value per active replica. (Default: `5`, Optional)
- `taskQueue` - This parameter specifies the task queue name. (Required)
- `queueTypes` - Task Queue type can be configured as `workflow`, `activity`, or both, separated by a comma (,) if multiple types are needed. (Default: `workflow`, Optional)
- `workerDeploymentName` - The name of the Temporal [Worker Deployment](https://docs.temporal.io/production-deployment/worker-deployments) to scale. When set together with `workerDeploymentBuildId`, the scaler queries `DescribeWorkerDeploymentVersion` for that specific deployment version's backlog instead of the task queue. Mutually exclusive with `buildId`, `selectAllActive`, and `selectUnversioned`. (Optional)
- `workerDeploymentBuildId` - The build ID of the worker within the deployment. Required together with `workerDeploymentName`. (Optional)
- `buildId` - *Deprecated.* Build IDs identify Worker versions under the legacy Rules-Based Versioning APIs, which the Temporal server has deprecated since December 2024 and will stop supporting soon. Use `workerDeploymentName` and `workerDeploymentBuildId` instead. (Optional)
- `selectAllActive` - *Deprecated.* Include all active versions under the legacy Rules-Based Versioning APIs. Use `workerDeploymentName` / `workerDeploymentBuildId` instead. (Default: `false`, Optional)
- `selectUnversioned` - *Deprecated.* Include the unversioned queue under the legacy Rules-Based Versioning APIs. Use `workerDeploymentName` / `workerDeploymentBuildId` instead. (Default: `false`, Optional)
- `includeRunningWorkflowCount` - When set to `true`, the scaler stays active if there are running workflows on the task queue even after the backlog drains to zero. This is useful for preventing premature scale-down when workers are fast and the backlog is often empty. It only affects the activity decision (`isActive`); the reported metric value is still the backlog count. See [Preventing premature scale-down](#preventing-premature-scale-down-with-includerunningworkflowcount) below for behavior details and important caveats. (Default: `false`, Optional)
- `workflowTaskQueueForCount` - Overrides which task queue is used for the running-workflow visibility count when `includeRunningWorkflowCount` is enabled. Useful when scaling activity workers off a workflow-owned queue: set `taskQueue` to the activity queue and `workflowTaskQueueForCount` to the workflow queue whose in-flight workflows should keep the activity workers alive. Has no effect if `includeRunningWorkflowCount` is `false`. (Optional)
- `apiKeyFromEnv` - API key for authentication similar to `apiKey`, but read from an environment variable (Optional)
- `minConnectTimeout` - This is the minimum amount of time we are willing to give a connection to complete. (Default:`5`, Optional)
- `unsafeSsl` - Whether to allow unsafe SSL (Default: `false`, Optional)
- `tlsServerName` - The custom tls server name (Optional)

> 💡 **NOTE:** Activation based on backlog may not be reliable when scaling to zero.
  This approach fails to account for in-flight tasks or workloads with throughput too low to trigger a backlog.
  Consequently, scaling to zero could result in undesirable behavior,
  such as terminating resources and subsequently having to scale back up to handle queued tasks. To address these challenges, consider customizing the cooldownPeriod or scale-down behavior of the Horizontal Pod Autoscaler (HPA).
  By fine-tuning the configurations, you can prevent premature scaling to zero,
  ensuring that resources remain available for in-flight tasks or workloads with minimal throughput.


**Authentication Parameters:**

Temporal supports `apiKey` and `mTLS` for authentication. You can use the following parameters to configure authentication:

- `apiKey` - API key for authentication with temporal cloud. (Optional)
- `ca` - Certificate authority file for TLS client authentication. (Optional)
- `cert` - Certificate for client authentication. (Optional)
- `key` - Key for client authentication. (Optional)
- `keyPassword` - If set the keyPassword is used to decrypt the provided key. (Optional)

### Example

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: temporal-secret
  namespace: default
type: Opaque
data:
  apiKey: TlJBSy0xMjM0NTY3ODkwMTIzNDU2Nwo= # base64 encoding of the new relic api key NRAK-12345678901234567
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-temporal
  namespace: default
spec:
  secretTargetRef:
  - parameter: apiKey
    name: temporal-secret
    key: apiKey
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: workload-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: my-worker
  pollingInterval: 5
  cooldownPeriod:  10
  minReplicaCount: 0
  maxReplicaCount: 5
  advanced:
    horizontalPodAutoscalerConfig:
      behavior:
        scaleDown:
          stabilizationWindowSeconds: 10
  triggers:
  - type: temporal
    metadata:
      namespace: default
      taskQueue: "workflow_with_single_noop_activity:test"
      targetQueueSize: "2"
      activationTargetQueueSize: "0"
      endpoint: temporal-frontend.temporal.svc.cluster.local:7233
    authenticationRef:
      name: keda-trigger-auth-temporal
```

### Example: Worker Deployment Version

When your workers use [Worker Deployment Versions](https://docs.temporal.io/worker-versioning#deployment-versions), configure the scaler with `workerDeploymentName` and `workerDeploymentBuildId` to scale the backlog of that specific deployment version. Each scale target should map to exactly one [Worker Deployment Version](https://docs.temporal.io/worker-versioning#deployment-versions).

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: my-worker-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: my-worker-v2-0-0
  minReplicaCount: 0
  maxReplicaCount: 5
  triggers:
  - type: temporal
    metadata:
      namespace: default
      taskQueue: "my-task-queue"
      targetQueueSize: "10"
      endpoint: temporal-frontend.temporal.svc.cluster.local:7233
      workerDeploymentName: my-worker
      workerDeploymentBuildId: v2.0.0
```

### Preventing premature scale-down with `includeRunningWorkflowCount`

When workers are fast and the backlog is often momentarily zero, the default backlog-only signal can cause the HPA to scale workers down while workflows are still executing. Enabling `includeRunningWorkflowCount` keeps the scaler active for as long as there are running workflows on the task queue, even when the backlog is below the activation threshold.

The reported metric value is unaffected. The setting only changes the activity decision (whether the scaler reports `isActive`), which controls whether the HPA is allowed to scale to zero.

For `workerDeploymentName` scalers, the check first consults the Worker Deployment Version status returned by `DescribeWorkerDeploymentVersion`:

- `DRAINING` versions stay active without a visibility query. Temporal keeps replaying pinned workflows on draining versions and tracks completion server-side; issuing a `CountWorkflow` here would just duplicate that signal at risk of a false negative during eventual consistency.
- `DRAINED`, `INACTIVE`, and unspecified versions are treated as inactive; they will scale down when the backlog reaches zero.
- `CURRENT` and `RAMPING` versions fall through to a scoped `CountWorkflow` query, scoping by `TemporalWorkerDeploymentVersion = '<deploymentName>:<buildId>'`.

For unversioned scalers (no `workerDeploymentName`), the visibility query additionally scopes by `TemporalWorkerDeploymentVersion is null`, so it does not pick up workflows owned by versioned workers on the same task queue.

**Activity-worker scaling.** Activity workers polling an activity-only task queue see no running workflows on their queue even when workflows are actively executing on a separate workflow queue. If you want your activity workers to stay alive while workflows are in flight, set `workflowTaskQueueForCount` to the workflow task queue whose in-flight workflows should keep the activity workers alive.

**Example:**

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: my-activity-worker-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: my-activity-worker
  minReplicaCount: 0
  maxReplicaCount: 5
  triggers:
  - type: temporal
    metadata:
      namespace: default
      taskQueue: "my-activity-queue"
      targetQueueSize: "10"
      endpoint: temporal-frontend.temporal.svc.cluster.local:7233
      includeRunningWorkflowCount: "true"
      workflowTaskQueueForCount: "my-workflow-queue"
```

#### Caveats

The running-workflow-count signal is intentionally an approximation. It should not be relied on as a strict guarantee of correct behavior; workloads that require strict guarantees should combine this trigger with a worker-utilization metric.

- **Activity-only workers.** By default, the check looks at the same task queue the scaler is scaling. If your activity workers poll a queue that never has running workflows on it (e.g. an activity-only task queue), the check will find nothing to keep the workers alive. Use `workflowTaskQueueForCount` to point at the workflow queue whose in-flight workflows should keep the activity workers awake.
- **Visibility is eventually consistent.** Temporal's visibility store is updated asynchronously by the history service. A workflow that has just started may not appear in `CountWorkflow` results for a few seconds. There is no SLA on this delay; under load or during history-service backpressure it can be significantly longer.
- **`CountWorkflow` is approximate.** The Temporal Visibility Count API is [documented as returning an approximate count](https://docs.temporal.io/visibility#count-workflow-by-executionstatus), not an exact one. Do not treat the returned count as authoritative.
- **Visibility rate limiting.** All Visibility APIs, including `Count`, are subject to a per-namespace frontend rate limit (roughly ~10 RPS per namespace per frontend instance in default configurations). Scalers with very short polling intervals or many trigger instances against the same namespace can exhaust this budget, causing the check to fall back to backlog-only.

