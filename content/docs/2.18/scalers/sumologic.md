+++
title = "Sumo Logic"
availability = "v2.18+"
maintainer = "Community"
category = "Monitoring & Analytics"
description = "Scale applications based on Sumo Logic logs searches and metrics queries."
go_file = "sumologic_scaler"
+++

## Trigger Specification

This specification describes the `sumologic` trigger that scales based on Sumo Logic logs searches and metrics queries. The scaler supports three different query types:

- **`logs`** - Scale based on Sumo Logic logs query results
- **`metrics`** - Scale based on single Sumo Logic metrics query results  
- **`metrics` (multi-query)** - Scale based on multiple combined Sumo Logic metrics queries

Here are examples of the different trigger configurations:

**Logs Query Example:**
```yaml
triggers:
- type: sumologic
  metadata:
    host: "https://api.sumologic.com"   # Sumo Logic API endpoint
    queryType: "logs"                   # Type must be "logs"
    query: "_view=my_view | count"      # Your Sumo Logic logs query
    resultField: "_count"               # Field to extract value from
    timerange: "15m"                    # Lookback window
    timezone: "Asia/Kolkata"            # Timezone (e.g., Asia/Kolkata)
    queryAggregator: "Max"              # Aggregation method: Latest, Avg, Sum, Count, Min, Max
    threshold: "1000"                   # Threshold for scaling
  authenticationRef:
    name: keda-trigger-auth-sumologic
```

**Single Metrics Query Example:**
```yaml
triggers:
- type: sumologic
  metadata:
    host: "https://api.sumologic.com"
    queryType: "metrics"
    query: "metric=cpu.usage | avg"
    quantization: "15s"
    rollup: "Max"
    timerange: "15m"
    timezone: "Asia/Kolkata"
    queryAggregator: "Max"
    threshold: "50"
  authenticationRef:
    name: keda-trigger-auth-sumologic
```

**Multi-Metrics Query Example:**
```yaml
triggers:
- type: sumologic
  metadata:
    host: "https://api.sumologic.com"
    queryType: "metrics"
    query.A: "metric=requests_total | rate"
    query.B: "metric=request_capacity"
    query.C: "(#A / #B) * 100 along service"
    resultQueryRowID: "C"          # Which query result to extract
    quantization: "15s"
    rollup: "Max"
    timerange: "15m"
    timezone: "Asia/Kolkata"
    queryAggregator: "Max"
    threshold: "75"
  authenticationRef:
    name: keda-trigger-auth-sumologic
```

**Parameter list:**

**Common Parameters:**

| Name             | Description                                                        | Required                   | Example                                 |
|------------------|--------------------------------------------------------------------|----------------------------|-----------------------------------------|
| `host`             | Sumo Logic API endpoint URL (Based on your Geo).                                        | Yes                        | `https://api.sumologic.com`               |
| `queryType`        | Type of query (`logs` or `metrics`).                                                     | Yes                        | `logs`                                    |
| `query`            | Sumo Logic query (for single queries).                                                     | Yes (for single queries)                        | `_view=my_view \| count`                         |
| `timerange`        | Time range to evaluate the query.                        | Yes                        | `15m`                                      |
| `timezone`         | Timezone for query execution.                                       | Optional (`UTC` default)                        | `Asia/Kolkata`                            |
| `queryAggregator`  | Aggregation method (`Latest`, `Avg`, `Sum`, `Count`, `Min`, `Max`).                             | Optional (`Avg` default)     | `Max`                                     |
| `threshold`        | Target value for scaling.                                           | Yes                        | `1000`                                    |

**Logs Query Specific Parameters:**

| Name             | Description                                                        | Required                   | Example                                 |
|------------------|--------------------------------------------------------------------|----------------------------|-----------------------------------------|
| `resultField`      | Field from query results to extract the scaling metric.            | Yes (for `logs` queries only)                       | `_count`                                  |

**Metrics Query Specific Parameters:**

| Name           | Description                                                        | Required | Example |
|----------------|--------------------------------------------------------------------|----------|---------|
| `quantization`   | Granularity of data points.                             | Yes (for `metrics` queries only)     | `15s`      |
| `rollup`         | Metrics rollup type (`Avg`, `Sum`, `Min`, `Max`, `Count`).                          | Optional (for `metrics` queries only, `Avg` default)      | `Max`     |

**Multi-Metrics Query Specific Parameters:**

| Name               | Description                                                              | Required | Example |
|--------------------|--------------------------------------------------------------------------|----------|---------|
| `query.A`, `query.B`, `query.C` etc | Multi-stage queries, where later queries can refer to earlier ones.    | Yes (for multi-metrics queries)      | `-` |
| `resultQueryRowID`   | Which final query (`A`, `B`, `C`, etc.) to use for scaling.                   | Yes (for multi-metrics queries)     | `C`       |

## Authentication Parameters

You must configure a `TriggerAuthentication` resource to authenticate with Sumo Logic.

**Prerequisites:**
- A Sumo Logic Access ID and Access Key

Authentication is handled through a Kubernetes `Secret` combined with a `TriggerAuthentication`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: sumologic-auth-secret
data:
  accessID: <base64-encoded-accessID>
  accessKey: <base64-encoded-accessKey>

---

apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-sumologic
spec:
  secretTargetRef:
    - parameter: accessID
      name: sumologic-auth-secret
      key: accessID
    - parameter: accessKey
      name: sumologic-auth-secret
      key: accessKey
```

### Example

Here is a complete example that demonstrates autoscaling based on Sumo Logic logs query:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: sumologic-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: my-deployment
  triggers:
  - type: sumologic
    metadata:
      host: "https://api.sumologic.com"
      queryType: "logs"
      query: "_view=error_logs | count"
      resultField: "_count"
      timerange: "5m"
      threshold: "100"
    authenticationRef:
      name: keda-trigger-auth-sumologic
```

### Notes

- `pollingInterval` controls how often KEDA polls Sumo Logic.
- `cooldownPeriod` controls how long KEDA waits before scaling down.
- `MetricType:` The scaler supports both `AverageValue` and `Value` metric types.
- Ensure that the Sumo Logic user has **appropriate access** to the queries being executed.

