+++
title = "Honeycomb"
availability = "v2.17+"
maintainer = "@kmoonwright"
description = "Scale workloads based on Honeycomb query results, allowing for event-driven autoscaling based on observability data."
+++

# Honeycomb Scaler

The Honeycomb scaler for KEDA enables Kubernetes workloads to scale based on the results of queries executed against [Honeycomb](https://www.honeycomb.io/) datasets. This allows for event-driven autoscaling based on observability metrics, giving you dynamic scaling capabilities tied to real-time application performance or event data.

> **Note:** The Honeycomb Scaler requires a [Honeycomb Enterprise](https://www.honeycomb.io/pricing/) plan, as it leverages features available only to Enterprise customers.

---

## Trigger Specification

This specification describes the `honeycomb` trigger that scales based on Honeycomb query results.
**An Enterprise Honeycomb account is required to use this scaler.**

```yaml
triggers:
  - type: honeycomb
    metadata:
      apiKey: <HONEYCOMB_API_KEY>
      dataset: frontend
      queryRaw: |
        {
          "breakdowns": ["k8s.deployment.name"],
          "calculations": [{"op": "COUNT"}],
          "orders": [{"op": "COUNT", "order": "descending"}],
          "limit": 100,
          "time_range": 7200
        }
      resultField: COUNT
      threshold: "10"
      activationThreshold: "0"
```

### Parameter List

- `apiKey` – Honeycomb API key. (Required)
- `dataset` – Name of the Honeycomb dataset to query. (Required)
- `queryRaw` – Raw JSON query to run against the Honeycomb API. If provided, this overrides other query fields. (Optional)
- `query` – Query object as key/value map. Used only if `queryRaw` is not provided. (Optional)
- `breakdowns` – List of breakdown fields to group results by. (Optional)
- `calculation` – Calculation operation for the query. (Values: COUNT, SUM, AVG, etc. Default: COUNT, Optional)
- `limit` – Maximum number of results to retrieve. (Default: 1, Optional)
- `timeRange` – Time range in seconds for the query. (Default: 60, Optional)
- `resultField` – Field name in the query result to extract as the metric value. If not set, the first numeric field is used. (Optional)
- `threshold` – Value at which to scale out the target. (Required)
- `activationThreshold` – Value above which KEDA considers the scaler as active, but below scaling threshold. (Default: 0, Optional)

---

## Authentication Parameters

You can use the `TriggerAuthentication` CRD to provide the `apiKey` securely via a Kubernetes Secret.

**Example using a Kubernetes Secret:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: honeycomb-api-key
type: Opaque
stringData:
  apiKey: <HONEYCOMB_API_KEY>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: honeycomb-auth
spec:
  secretTargetRef:
    - parameter: apiKey
      name: honeycomb-api-key
      key: apiKey
```

---

## Example

Here is a full example of a KEDA `ScaledObject` using the Honeycomb scaler and authentication:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: honeycomb-scaler
  namespace: default
spec:
  scaleTargetRef:
    name: hello-world
  triggers:
    - type: honeycomb
      metadata:
        dataset: frontend
        queryRaw: |
          {
            "breakdowns": ["k8s.deployment.name"],
            "calculations": [{"op": "COUNT"}],
            "orders": [{"op": "COUNT", "order": "descending"}],
            "limit": 100,
            "time_range": 7200
          }
        resultField: COUNT
        threshold: "10"
        activationThreshold: "0"
      authenticationRef:
        name: honeycomb-auth
```

---

## API Restrictions & Licensing

> **Important:**  
> - **Enterprise License Required:** The Honeycomb scaler requires a Honeycomb Enterprise plan. This scaler will not work with free or non-Enterprise Honeycomb accounts. Further details available in Honeycomb's [API documentation](https://api-docs.honeycomb.io/api/query-data).
> - **API Rate & Query Restrictions:**  
>   - **Data Availability:** Query Results can only be created for events with timestamps within the past 7 days.
>   - **Time Range Truncation:**  
>     - Queries ≤ 6 hours: results truncated to the nearest 1 minute.  
>     - > 6 hours and ≤ 2 days: results truncated to the nearest 5 minutes.  
>     - > 2 days and ≤ 7 days: results truncated to the nearest 30 minutes.
>   - **Rate Limiting:** Creating a Query Result is rate limited to **10 requests per minute** per dataset. If rate limited, the API will return status code 429.
>   - **Query Timeout:** Each Query Result must return within **10 seconds**, or the API call will fail.

**Query Results Workflow:**  
1. **Create a Query** (validates parameters, does not execute).
2. **Run Query Asynchronously** (creates a Query Result and returns a Query Result ID).
3. **Poll Query Result Endpoint** with the Query Result ID until data is ready.

You can re-run queries with a relative `time_range` for rolling windows (e.g., last 2 hours) as needed for autoscaling logic.

---

## Notes

- If both `queryRaw` and structured fields (like `breakdowns`, `calculation`, etc.) are provided, `queryRaw` takes precedence.
- If `resultField` is not provided, the scaler will use the first numeric field found in the results.
- The scaler polls Honeycomb with exponential backoff if results are not immediately available.
- Supports any Honeycomb query result as long as it returns a numeric value.
- Use `activationThreshold` to avoid scaling from zero on low-noise metrics.

---

**Maintainer:** @kmoonwright  
**Availability:** KEDA v2.17+

