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
      buildId: 1.0.0 # optional
      selectAllActive: "false" # optional
      selectUnversioned: "false" # optional
      minConnectTimeout: "5" # optional
      unsafeSsl: "false" # optional
      tlsServerName: "custom-tls-servername" # optional
```

**Parameter list:**

- `endpoint` - This parameter specifies the URL of the Temporal gRPC service. You need to provide the service address in the format `<hostname>:<port>`. **Temporal Cloud endpoints differ by authentication method:** API Key auth uses the regional endpoint `<region>.<provider>.api.temporal.io:7233` (e.g., `us-east-1.aws.api.temporal.io:7233`); mTLS auth uses the namespace endpoint `<namespace>.<account>.tmprl.cloud:7233` (e.g., `my-ns.a1b2c.tmprl.cloud:7233`).
- `endpointFromEnv` - Defines the endpoint, similar to the `endpoint` parameter, but the value is read from an environment variable. (Optional)
- `namespace` - The namespace of the temporal service. (Default:`default`, Optional)
- `activationTargetQueueSize` - This sets the target value for activating the scaler. More information about activation thresholds can be found  [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)
- `targetQueueSize` - Target value for queue length passed to the scaler. The scaler will cause the replicas to increase if the queue message count is greater than the target value per active replica. (Default: `5`, Optional)
- `taskQueue` - This parameter specifies the task queue name. (Required)
- `queueTypes` - Task Queue type can be configured as `workflow`, `activity`, or both, separated by a comma (,) if multiple types are needed. (Default: `workflow`, Optional)
- `buildId` - Build IDs identify Worker versions for Workflow versioning and task compatibility (Optional)
- `selectAllActive` - Include all active versions (Default:`false`, Optional)
- `selectUnversioned` - Include the unversioned queue (Default:`false`, Optional)
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

> **Temporal Cloud Authentication:**
> - **API Key**: Set `apiKey` and use the regional endpoint (`<region>.<provider>.api.temporal.io:7233`). The SDK handles TLS automatically — no certificates needed. For HA namespaces, use the namespace endpoint (`<namespace>.<account>.tmprl.cloud:7233`) instead.
> - **mTLS**: Set `cert`, `key`, (optionally `ca`) and use the namespace endpoint (`<namespace>.<account>.tmprl.cloud:7233`). Client certificates are required.

### Examples

#### API Key Authentication

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: temporal-secret
  namespace: default
type: Opaque
data:
  apiKey: TlJBSy0xMjM0NTY3ODkwMTIzNDU2Nwo= # base64 encoded API key
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
    name: workload-scaledobject
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
      # Self-hosted: temporal-frontend.temporal.svc.cluster.local:7233
      # Temporal Cloud (API key): <region>.<provider>.api.temporal.io:7233
      endpoint: us-east-1.aws.api.temporal.io:7233
    authenticationRef:
      name: keda-trigger-auth-temporal
```

#### mTLS Authentication

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: temporal-mtls-secret
  namespace: default
type: Opaque
data:
  cert: <base64 encoded client certificate>
  key: <base64 encoded client private key>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-temporal-mtls
  namespace: default
spec:
  secretTargetRef:
  - parameter: cert
    name: temporal-mtls-secret
    key: cert
  - parameter: key
    name: temporal-mtls-secret
    key: key
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: workload-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: workload-scaledobject
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
      namespace: my-ns
      taskQueue: "workflow_with_single_noop_activity:test"
      targetQueueSize: "2"
      activationTargetQueueSize: "0"
      # Temporal Cloud (mTLS): <namespace>.<account>.tmprl.cloud:7233
      endpoint: my-ns.a1b2c.tmprl.cloud:7233
    authenticationRef:
      name: keda-trigger-auth-temporal-mtls
```
