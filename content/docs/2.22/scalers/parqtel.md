+++
title = "Parqtel"
availability = "v2.22+"
maintainer = "Community"
category = "Metrics"
description = "Scale applications based on a Parqtel query."
go_file = "parqtel_scaler"
+++

### Trigger Specification

This specification describes the `parqtel` trigger that scales based on a query executed against a [Parqtel](https://parqtel.github.io) instance. By default it runs a PQL/PromQL metric query against the Prometheus-compatible API (`/api/v1/query` for instant queries and `/api/v1/query_range` for range queries). With `signal: logs` it scales on ingested log volume (`/v1/logs/count`), and with `signal: traces` it scales on trace volume (`/v1/traces/search`).

```yaml
triggers:
- type: parqtel
  metadata:
    # Required fields:
    serverAddress: http://<parqtel-host>:9090
    signal: 'metrics'                       # 'metrics' (default), 'logs', or 'traces'
    query: rate(http_requests_total{service="api"}[1m])   # PQL for metrics, log selector for logs, ParqtelQL for traces
    threshold: '10'
    # Optional fields:
    activationThreshold: '5'
    queryType: 'instant'                    # 'instant' (default) or 'range' (metrics only)
    rangeStart: '5m'                        # relative offset before now, or unix seconds / RFC3339 (range queries)
    rangeEnd: '0s'                          # relative offset before now, or unix seconds / RFC3339 (range queries)
    rangeStep: '60s'                        # default '60s'
    resultAggregation: 'first'              # first (default), last, sum, max, min, avg, count
    customHeaders: X-Client-Id=cid,X-Tenant-Id=tid
    queryParameters: key-1=value-1,key-2=value-2
    ignoreNullValues: "true"                # default true
    unsafeSsl: "false"                      # default false
    timeout: "1000"                         # HTTP client timeout in milliseconds
```

**Parameter list:**

- `serverAddress` - Address of the Parqtel server, e.g. `http://<parqtel-host>:9090`. (Required)
- `signal` - Which signal to scale on: `metrics` (default), `logs`, or `traces`. (Default: `metrics`, Optional)
- `query` - The query to run. For `metrics`, a PQL/PromQL expression; for `logs`, a log selector such as `{service="api", severity="error"}`; for `traces`, a ParqtelQL span predicate such as `service.name="api"`. (Required)
- `threshold` - Value to start scaling for. This value can be a float. (Required)
- `activationThreshold` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)
- `queryType` - Query type: `instant` (default) or `range`. (Optional)
- `rangeStart` - Start of the time window. Accepts a relative duration (e.g. `5m`, interpreted as that offset before now), unix seconds, or an RFC3339 timestamp. Using a relative duration keeps the window tracking current load; a fixed absolute timestamp freezes the window on a historical range. Defaults to now minus 5 minutes. (Optional, range queries and `logs`/`traces` signals)
- `rangeEnd` - End of the time window. Accepts a relative duration (e.g. `0s`, meaning now), unix seconds, or an RFC3339 timestamp. Defaults to now. (Optional, range queries and `logs`/`traces` signals)
- `rangeStep` - Resolution of the range query, e.g. `60s`. (Default: `60s`, Optional, range queries)
- `resultAggregation` - How to reduce multiple values to a single value: `first` (default), `last`, `sum`, `max`, `min`, `avg`, or `count`. For `metrics` it reduces matched series; for `logs` it reduces the per-bucket counts (use `sum` for total log volume over the window). Not used for `traces`, which reports a single `spans_matched` count. (Optional)
- `customHeaders` - Custom headers to include while querying the Parqtel endpoint. For authentication headers, use `authModes` instead. (Optional)
- `queryParameters` - Extra query parameters to append to the request. (Optional)
- `ignoreNullValues` - Whether to treat empty, `Inf`, or `NaN` results as zero instead of an error. (Values: `true`, `false`, Default: `true`, Optional)
- `unsafeSsl` - Skip TLS certificate verification when using self-signed certificates. (Default: `false`, Optional)
- `timeout` - Custom timeout for the HTTP client, in milliseconds. (Optional)

**Authentication:**

The scaler supports `basic`, `bearer`, `custom`, and `tls` authentication modes. Configure them with `authModes` and the matching parameters in a `TriggerAuthentication` object:

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: parqtel-auth
spec:
  authModes:
    - bearer
  bearerToken: my-token
```

Reference it from the ScaledObject with `authenticationRef`.

### Example

Below is an example ScaledObject that scales a deployment based on the request rate reported in Parqtel.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: parqtel-scaler
  namespace: default
spec:
  scaleTargetRef:
    name: deployment-name-to-be-scaled
  minReplicaCount: 1
  maxReplicaCount: 10
  pollingInterval: 30
   triggers:
   - type: parqtel
     metadata:
       serverAddress: http://parqtel.default.svc.cluster.local:9090
       query: rate(http_requests_total{service="api"}[1m])
       threshold: '10'
       activationThreshold: '5'
```

### Scaling on logs and traces

The same trigger can scale on log or trace volume ingested into Parqtel. Set `signal` to `logs` or `traces`; the `query` field becomes the log selector or trace filter, and `rangeStart`/`rangeEnd` bound the time window (default: the last 5 minutes).

Scale on the total number of matching log lines in the last 5 minutes:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: parqtel-log-scaler
  namespace: default
spec:
  scaleTargetRef:
    name: deployment-name-to-be-scaled
  minReplicaCount: 1
  maxReplicaCount: 10
  pollingInterval: 30
  triggers:
  - type: parqtel
    metadata:
      serverAddress: http://parqtel.default.svc.cluster.local:9090
      signal: logs
      query: '{service="api", severity="error"}'
      rangeStart: '5m'
      resultAggregation: sum
      threshold: '100'
      activationThreshold: '20'
```

Scale on the number of matching spans in the last 5 minutes:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: parqtel-trace-scaler
  namespace: default
spec:
  scaleTargetRef:
    name: deployment-name-to-be-scaled
  minReplicaCount: 1
  maxReplicaCount: 10
  pollingInterval: 30
  triggers:
  - type: parqtel
    metadata:
      serverAddress: http://parqtel.default.svc.cluster.local:9090
      signal: traces
      query: 'service.name="api"'
      rangeStart: '5m'
      threshold: '50'
      activationThreshold: '10'
```
