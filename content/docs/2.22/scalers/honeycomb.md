+++
title = "Honeycomb"
availability = "v2.22+"
maintainer = "Honeycomb"
category = "Metrics"
description = "Scale applications based on the result of a Honeycomb query."
go_file = "honeycomb_scaler"
+++

> **Honeycomb Enterprise only.** This scaler uses the Honeycomb [Query Data API](https://api-docs.honeycomb.io/api/query-data). Access to the Query Data API requires a [Honeycomb Enterprise](https://www.honeycomb.io/pricing) customer agreement. The scaler does not work with Honeycomb Free or Pro accounts: Honeycomb rejects the request with `403 Forbidden`, and the scaler reports an error.

### Trigger Specification

This specification describes the `honeycomb` trigger that scales based on the result of a [Honeycomb](https://www.honeycomb.io) query.

```yaml
triggers:
- type: honeycomb
  metadata:
    dataset: checkout
    query: |
      {
        "calculations": [{"op": "COUNT"}],
        "filters": [
          {"column": "service.name", "op": "=", "value": "checkout"}
        ],
        "time_range": 120
      }
    resultField: COUNT
    threshold: "100"
    activationThreshold: "0"
    apiHost: https://api.honeycomb.io
  authenticationRef:
    name: keda-trigger-auth-honeycomb
```

**Parameter list:**

- `dataset` - Slug of the Honeycomb dataset to query. Use `__all__` to query all datasets in the environment.
- `query` - Honeycomb query specification as a JSON object. It uses the same format as the body of the [Create a Query](https://api-docs.honeycomb.io/api/queries/createquery) API, for example `calculations`, `filters`, `breakdowns`, `orders`, `limit`, and `time_range`. Use a relative `time_range` (in seconds) and do not set `start_time` or `end_time`, so that each run covers the most recent data.
- `resultField` - Name of the field in the query result to use as the metric value. Honeycomb names result fields after the calculation, for example `COUNT`, `P99(duration_ms)`, or `AVG(duration_ms)`. When this is not set, the first result row must contain exactly one numeric field. (Optional, Required when the result has more than one numeric field)
- `threshold` - Target value for the metric, used by the HPA to calculate the number of replicas.
- `activationThreshold` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)
- `apiHost` - Honeycomb API host. Use `https://api.eu1.honeycomb.io` for Honeycomb EU accounts. (Default: `https://api.honeycomb.io`, Optional)
- `timeout` - Timeout for each HTTP request to the Honeycomb API, for example `5s`. (Default: the KEDA global HTTP timeout, Optional)

The metric name is generated from the trigger index and the dataset, for example `s0-honeycomb-checkout`.

### Authentication Parameters

You must use a `TriggerAuthentication` or `ClusterTriggerAuthentication` to provide the API key. The scaler does not read the API key from trigger metadata.

- `apiKey` - A Honeycomb [Configuration API key](https://docs.honeycomb.io/configure/environments/manage-api-keys/) for the environment that contains the dataset. The key must have the **Run Queries** and **Manage Queries and Columns** permissions. An Ingest API key does not work.

### How the scaler queries Honeycomb

The Query Data API runs queries asynchronously. On each check, the scaler:

1. Creates the query from `query` once, and reuses the query ID for all later runs.
2. Creates a query result for the query.
3. Polls the query result until it is complete, for up to 15 seconds.
4. Reads `resultField` from the first row of the result.

The scaler reads only the first result row. When you use `breakdowns`, use `orders` and `limit` in the query to control which group is the first row.

When no events match the query, Honeycomb returns no rows and the scaler reports `0`. This lets a workload scale to zero when it has no traffic. A typing error in a filter also matches no events, so check your query in the Honeycomb UI before you use it for scaling.

A failed query, a `429` rate limit response, or a missing `resultField` makes the scaler return an error. Use [`fallback`](./../reference/scaledobject-spec.md#fallback) to set the number of replicas for this case.

### Query Data API limits

The Query Data API has the following [restrictions](https://api-docs.honeycomb.io/api/query-data). Honeycomb can change them.

- **Rate limit:** Creating query results is limited to 10 requests per minute. Each trigger creates at most one query result per minute. Between runs, the trigger reports the value from its last run, so the HPA and the KEDA operator can check it as often as they need to. Other Honeycomb triggers and other Query Data API clients can share this limit. When you plan many Honeycomb triggers, contact Honeycomb about your rate limits.
- **Time range:** Queries can only cover events from the last 7 days. For a `time_range` of 6 hours or less, Honeycomb returns the same result for all runs of a query in the same minute, and the scaler runs each query at most once per minute. The value can therefore be up to about a minute old. Use a `time_range` of at least `60`.
- **Query duration:** A query result must complete within 10 seconds. Keep queries small, for example with filters that select one service and a short `time_range`.
- **Relational fields:** Queries that use relational fields have a lower rate limit and are not recommended for scaling.

The metric value is the result for the whole `time_range`. For example, `COUNT` with `"time_range": 120` is the number of events in the last two minutes, not per second. Set `threshold` for the same window.

### Example

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-honeycomb-secret
  namespace: my-project
type: Opaque
stringData:
  apiKey: "<honeycomb-configuration-api-key>"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-honeycomb
  namespace: my-project
spec:
  secretTargetRef:
  - parameter: apiKey
    name: keda-honeycomb-secret
    key: apiKey
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: checkout-scaledobject
  namespace: my-project
spec:
  scaleTargetRef:
    name: checkout
  minReplicaCount: 1
  maxReplicaCount: 20
  fallback:
    failureThreshold: 3
    replicas: 5
  triggers:
  - type: honeycomb
    metadata:
      dataset: checkout
      # Requests to the checkout service in the last 2 minutes.
      query: |
        {
          "calculations": [{"op": "COUNT"}],
          "filters": [
            {"column": "service.name", "op": "=", "value": "checkout"},
            {"column": "span.kind", "op": "=", "value": "server"}
          ],
          "time_range": 120
        }
      resultField: COUNT
      # One replica per 600 requests in 2 minutes (5 per second).
      threshold: "600"
    authenticationRef:
      name: keda-trigger-auth-honeycomb
```

#### Scale on latency

This trigger adds replicas when the p99 latency of the `checkout` service is above 250 ms. Use `metricType: Value`, because latency does not get smaller when you divide it by the number of replicas.

```yaml
  triggers:
  - type: honeycomb
    metricType: Value
    metadata:
      dataset: checkout
      query: |
        {
          "calculations": [{"op": "P99", "column": "duration_ms"}],
          "filters": [
            {"column": "service.name", "op": "=", "value": "checkout"}
          ],
          "time_range": 300
        }
      resultField: P99(duration_ms)
      threshold: "250"
    authenticationRef:
      name: keda-trigger-auth-honeycomb
```
