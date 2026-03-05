+++
title = "IONOS Monitoring"
availability = "v2.20+"
maintainer = "Community"
category = "Metrics"
description = "Scale applications based on IONOS Monitoring metrics."
go_file = "ionos_monitoring_scaler"
+++

### Trigger Specification

This specification describes the `ionos-monitoring` trigger that scales based on metrics from [IONOS Monitoring](https://docs.ionos.com/cloud/managed-services/monitoring-as-a-service).

IONOS Monitoring exposes a Mimir-compatible Prometheus HTTP API that this scaler queries using PromQL instant queries.

```yaml
triggers:
- type: ionos-monitoring
  metadata:
    # Required fields:
    host: https://<pipeline-id>-metrics.<account-id>.monitoring.<region>.ionos.com
    query: sum(rate(http_requests_total{deployment="my-deployment"}[2m])) # Note: query must return a single-element vector/scalar
    threshold: '100'
    # Optional fields:
    activationThreshold: '0'   # Default: 0
    ignoreNullValues: "true"   # Default: true
  authenticationRef:
    name: ionos-monitoring-trigger-auth
```

**Parameter list:**

- `host` - The pipeline HTTP endpoint from IONOS Monitoring pipeline creation. Example: `https://123456789-metrics.987654321.monitoring.de-txl.ionos.com`
- `query` - PromQL expression evaluated as an instant query. The query must return a single-element vector or scalar.
- `threshold` - Value to start scaling for. (This value can be a float)
- `activationThreshold` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional, This value can be a float)
- `ignoreNullValues` - When `true`, an empty result set returns `0` instead of an error. When `false`, the scaler returns an error if the query returns no results. (Values: `true`, `false`, Default: `true`, Optional)

### Authentication Parameters

The IONOS Monitoring scaler requires an API key for authentication. The API key is sent as a Bearer token in the `Authorization` header.

Use `TriggerAuthentication` to pass the API key securely:

**API key authentication:**

- `apiKey` - The pipeline API key credential from IONOS Monitoring. This is a required field.

### Example

#### Basic Example

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ionos-monitoring-secret
  namespace: default
data:
  apiKey: "<base64-encoded-api-key>"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: ionos-monitoring-trigger-auth
  namespace: default
spec:
  secretTargetRef:
    - parameter: apiKey
      name: ionos-monitoring-secret
      key: apiKey
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: ionos-monitoring-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: my-deployment
  minReplicaCount: 1
  maxReplicaCount: 10
  triggers:
  - type: ionos-monitoring
    metadata:
      host: https://123456789-metrics.987654321.monitoring.de-txl.ionos.com
      query: sum(rate(http_requests_total{deployment="my-deployment"}[2m]))
      threshold: '100'
    authenticationRef:
      name: ionos-monitoring-trigger-auth
```

#### Example with Activation Threshold

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: ionos-monitoring-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: my-deployment
  minReplicaCount: 0
  maxReplicaCount: 10
  triggers:
  - type: ionos-monitoring
    metadata:
      host: https://123456789-metrics.987654321.monitoring.de-txl.ionos.com
      query: sum(rate(http_requests_total{deployment="my-deployment"}[2m]))
      threshold: '100'
      activationThreshold: '10'
      ignoreNullValues: "false"
    authenticationRef:
      name: ionos-monitoring-trigger-auth
```
