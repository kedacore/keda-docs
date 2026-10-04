+++
title = "Parqtel"
availability = "v2.22+"
maintainer = "Community"
category = "Metrics"
description = "Scale applications based on a Parqtel query."
go_file = "parqtel_scaler"
+++

### Trigger Specification

This specification describes the `parqtel` trigger that scales based on the result of a PQL/PromQL query executed against a [Parqtel](https://parqtel.github.io) instance's Prometheus-compatible query API (`/api/v1/query` for instant queries and `/api/v1/query_range` for range queries).

```yaml
triggers:
- type: parqtel
  metadata:
    # Required fields:
    serverAddress: http://<parqtel-host>:9090
    query: rate(http_requests_total{service="api"}[1m])
    threshold: '10'
    # Optional fields:
    activationThreshold: '5'
    queryType: 'instant'                    # 'instant' (default) or 'range'
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
- `query` - The PQL/PromQL query to run. (Required)
- `threshold` - Value to start scaling for. This value can be a float. (Required)
- `activationThreshold` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)
- `queryType` - Query type: `instant` (default) or `range`. (Optional)
- `rangeStart` - Start of the range window. Accepts a relative duration (e.g. `5m`, interpreted as that offset before now), unix seconds, or an RFC3339 timestamp. Using a relative duration keeps the window tracking current load; a fixed absolute timestamp freezes the window on a historical range. Defaults to now minus 5 minutes. (Optional, range queries)
- `rangeEnd` - End of the range window. Accepts a relative duration (e.g. `0s`, meaning now), unix seconds, or an RFC3339 timestamp. Defaults to now. (Optional, range queries)
- `rangeStep` - Resolution of the range query, e.g. `60s`. (Default: `60s`, Optional, range queries)
- `resultAggregation` - How to reduce multiple matched series to a single value: `first` (default), `last`, `sum`, `max`, `min`, `avg`, or `count`. Use an aggregation when the query can return more than one series. (Optional)
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
