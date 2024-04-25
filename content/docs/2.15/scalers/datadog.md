+++
title = "Datadog"
availability = "v2.6+"
maintainer = "Datadog"
description = "Scale applications based on Datadog."
go_file = "datadog_scaler"
+++

> 💡 **NOTE:** Take into account [API Datadog endpoints rate
limits](https://docs.datadoghq.com/api/latest/rate-limits/) when defining
polling interval. For more detailed information about polling intervals check
[the Polling intervals and Datadog rate limiting
section](#polling-intervals-and-datadog-rate-limiting).

### Trigger Specification

This specification describes the `datadog` trigger that scales based on a Datadog metric.

```yaml
triggers:
- type: datadog
  metricType: Value
  metadata:
    query: "sum:trace.redis.command.hits{env:none,service:redis}.as_count()"
    queryValue: "7.75"
    activationQueryValue: "1.1"
    queryAggregator: "max"
    type: "global" # Deprecated in favor of trigger.metricType
    age: "120"
    timeWindowOffset: "30"
    lastAvailablePointOffset: "1"
    metricUnavailableValue: "1.5"
```

**Parameter list:**

- `query` - The Datadog query to run.
- `queryValue` - Value to reach to start scaling (This value can be a float).
- `activationQueryValue` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional, This value can be a float)
- `queryAggregator` - When `query` is multiple queries, comma-seperated, this sets how to aggregate the multiple results. (Values: `max`, `average`, Required only when `query` contains multiple queries)
- `type` - Whether to start scaling based on the value or the average between pods. (Values: `average`, `global`, Default:`average`, Optional)
- `age`: The time window (in seconds) to retrieve metrics from Datadog. (Default: `90`, Optional)
- `timeWindowOffset`: The delayed time window offset (in seconds) to wait for the metric to be available. The values of some queries might be not available at now and need a small delay to become available, try to adjust `timeWindowOffset` if you encounter this issue. (Default: `0`, Optional)
- `lastAvailablePointOffset`: The offset to retrieve the X to last data point. The value of last data point of some queries might be inaccurate [because of the implicit rollup function](https://docs.datadoghq.com/dashboards/functions/rollup/#rollup-interval-enforced-vs-custom), try to adjust to `1` if you encounter this issue. (Default: `0`, Optional)
- `metricUnavailableValue`: The value of the metric to return to the HPA if Datadog doesn't find a metric value for the specified time window. If not set, an error will be returned to the HPA, which will log a warning. (Optional, This value can be a float)

> 💡 **NOTE:** The `type` parameter is deprecated in favor of the global `metricType` and will be removed in a future release. Users are advised to use `metricType` instead.

### Authentication

Datadog requires both an API key and an APP key to retrieve metrics from your account.

You should use `TriggerAuthentication` CRD to configure the authentication:

**Parameter list:**

- `apiKey` - Datadog API key.
- `appKey` - Datadog APP key.
- `datadogSite` - Datadog site where to get the metrics from. This is commonly referred as DD_SITE in Datadog documentation. (Default: `datadoghq.com`, Optional)

### Example

The example below uses the default KEDA polling interval (30 seconds). Take into
account that [API Datadog endpoints are rate
limited](https://docs.datadoghq.com/api/latest/rate-limits/) and reducing the
polling interval can accelerate reaching it. If your account has reached its
rate limit, a relevant error will be logged in KEDA.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: datadog-secrets
  namespace: my-project
type: Opaque
data:
  apiKey: # Required: base64 encoded value of Datadog apiKey
  appKey: # Required: base64 encoded value of Datadog appKey
  datadogSite: # Optional: base64 encoded value of Datadog site
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-datadog-secret
  namespace: my-project
spec:
  secretTargetRef:
    # Required: API key for your Datadog account
  - parameter: apiKey
    name: datadog-secrets
    key: apiKey
    # Required: APP key for your Datadog account
  - parameter: appKey
    name: datadog-secrets
    key: appKey
    # Optional: Datadog site. Default: "datadoghq.com"
  - parameter: datadogSite
    name: datadog-secrets
    key: datadogSite
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: datadog-scaledobject
  namespace: my-project
spec:
  scaleTargetRef:
    name: worker
  triggers:
  - type: datadog
    # Optional: (Value or AverageValue). Whether the target value is global or average per pod. Default: AverageValue
    metricType: "Value"
    metadata:
      # Required: datadog metric query
      query: "sum:trace.redis.command.hits{env:none,service:redis}.as_count()"
      # Required: according to the number of query result, to scale the TargetRef
      queryValue: "7"
      # Optional: The time window (in seconds) to retrieve metrics from Datadog. Default: 90
      age: "120"
      # Optional: The metric value to return to the HPA if a metric value wasn't found for the specified time window
      metricUnavailableValue: "0"
    authenticationRef:
      name: keda-trigger-auth-datadog-secret
```

## Polling intervals and Datadog rate limiting

[API Datadog endpoints are rate
limited](https://docs.datadoghq.com/api/latest/rate-limits/). Depending on the
state of the `ScaledObject` there are two different parameters to control how
often (per `ScaledObject`) we query Datadog for a metric.

When scaling from 0 to 1, the polling interval is controlled by KEDA, using [the
`spec.pollingInterval` parameter in the `ScaledObject`
definition](../concepts/scaling-deployments/#pollinginterval). For example, if
this parameter is set to `60`, KEDA will poll Datadog for a metric value every
60 seconds while the number of replicas is 0.

While scaling from 1 to N, on top of KEDA, the HPA will also poll regularly
Datadog for metrics, based on [the `--horizontal-pod-autoscaler-sync-period`
parameter to the
`kube-controller-manager`](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/#options),
which by default is 15 seconds. For example, if the `kube-controller-manager`
was started with `--horizontal-pod-autoscaler-sync-period=30`, the HPA will poll
Datadog for a metric value every 30 seconds while the number of replicas is
between 1 and N.

## Multi-Query Support

To reduce issues with API rate limiting from Datadog, it is possible to send a single query, which contains multiple queries, comma-seperated.
When doing this, the results from each query are aggregated based on the `queryAggregator` value (eg: `max` or `average`).

> 💡 **NOTE:** Because the average/max aggregation operation happens at the scaler level, there won't be any validation or errors if the queries don't make sense to aggregate. Be sure to read and understand the two patterns below before using Multi-Query.

### Example 1 - Aggregating Similar Metrics

Simple aggregation works well, when wanting to scale on more than one metric with similar return values/scale (ie. where multiple metrics can use a single `queryValue` and still make sense).

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: datadog-scaledobject
  namespace: my-project
spec:
  scaleTargetRef:
    name: worker
  triggers:
  - type: datadog
    metricType: "AverageValue"
    metadata:
      # Comma-seperated querys count as a single API call:
      query: "per_second(sum:http.requests{service:myservice1}).rollup(max, 300)),per_second(sum:http.requests{service:myservice1}).rollup(avg, 600)"
      # According to aggregated results, how to scale the TargetRef
      queryValue: "100"
      # How to aggregate results from multi-query queries. Default: 'max'
      queryAggregator: "average"
      # Optional: The time window (in seconds) to retrieve metrics from Datadog. Default: 90
      age: "600"
      # Optional: The metric value to return to the HPA if a metric value wasn't found for the specified time window
      metricUnavailableValue: "0"
    authenticationRef:
      name: keda-trigger-auth-datadog-secret
```

The example above looks at the `http.requests` value for a service; taking two views of the same metric (max vs avg, and different time windows), and then uses a scale value which is the average of them both.

This works particularly well when scaling against the same metric, but with slightly different parameters, or methods like ```week_before()``` for example.

### Example 2 - Driving scale directly

When wanting to scale on non-similar metrics, whilst still benefiting from reduced API calls with multi-query support, the easiest way to do this is to make each query directly return the desired scale (eg: number of pods), and then `max` or `average` the results to get the desired target scale.

This can be done by adding arthmetic to the queries, which makes them directly return the number of pods that should be running.

Following this pattern, and then setting `queryValue: 1` and `metricType: AverageValue` results in the desired number of pods being spawned directly from the results of the metric queries.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: datadog-scaledobject
  namespace: my-project
spec:
  scaleTargetRef:
    name: worker
  triggers:
  - type: datadog
    # `AverageValue` tracks the query results divided by the number of running containers
    metricType: "AverageValue"
    metadata:
      # Comma-seperated queries count as a single API call:
      ## This example returns "http.requests" @ 180 requests-per-second per-pod,
      ## and "http.backlog" size of 30 per-pod
      query: "per_second(sum:http.requests{service:myservice1}).rollup(max, 300))/180,per_second(sum:http.backlog{service:myservice1}).rollup(max, 300)/30"
      # Setting query value to 1 and metricType to "AverageValue" allows the metric to dictate the number of pods from it's own arthimetic.
      queryValue: "1"
      # How to aggregate results from multi-query queries. Default: 'max'
      queryAggregator: "max"
    authenticationRef:
      name: keda-trigger-auth-datadog-secret
```

Using the example above, if we assume that `http.requests` is currently returning `360`, dividing that by `180` in the query, results in a value of `2`; if `http.backlog` returns `90`, dividing that by `30` in the query, results in a value of `3`. With the `max` Aggregator set, the scaler will set the target scale to `3` as that is the higher value from all returned queries.

## Cases of unexpected metrics value in DataDog API response

### Latest data point is unavailable

By default, Datadog scaler retrieves the metrics with time window from `now - metadata.age (in seconds)` to `now`, however, some kinds of queries need a small delay (usually 30 secs - 2 mins) before data is available when querying from the API. In this case, adjust `timeWindowOffset` to ensure that the latest point of your query is always available.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: datadog-scaledobject
  namespace: my-project
spec:
  scaleTargetRef:
    name: worker
  triggers:
  - type: datadog
    metricType: "AverageValue"
    metadata:
      query: "sum:trace.express.request.hits{*}.as_rate()"
      queryValue: "100"
      age: "90"
      metricUnavailableValue: "0"
      # Optional: The delayed time window offset (in seconds) to wait for the metric to be available. The values of some queries might be not available at now and need a small delay to become available, try to adjust it if you encounter this issue. Default: 0
      timeWindowOffset: "30"
      # Optional: The offset to retrieve the X to last data point. The value of last data point of some queries might be inaccurate, try to adjust to 1 if you encounter this issue. Default: 0
      lastAvailablePointOffset: "1"
    authenticationRef:
      name: keda-trigger-auth-datadog-secret
```
Check [here](https://github.com/kedacore/keda/pull/3954#discussion_r1042820206) for the details of this issue

### The value of last data point is inaccurate

Datadog implicitly rolls up data points automatically with the `avg` method, effectively displaying the average of all data points within a time interval for a given metric. Essentially, there is a rollup for each point. The values at the end attempt to have the rollup applied. When this occurs, it looks at a X second bucket according to your time window, and will default average those values together. Since this is the last point in the query, there are no other values to average with in that X second bucket. This leads to the value of last data point that was not rolled up in the same fashion as the others, and leads to an inaccurate number. In these cases, adjust `lastAvailablePointOffset` to 1 to use the second to last points of an API response would be the most accurate.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: datadog-scaledobject
  namespace: my-project
spec:
  scaleTargetRef:
    name: worker
  triggers:
  - type: datadog
    metricType: "AverageValue"
    metadata:
      query: "sum:trace.express.request.hits{*}.as_rate()"
      queryValue: "100"
      age: "90"
      metricUnavailableValue: "0"
      # Optional: The delayed time window offset (in seconds) to wait for the metric to be available. The values of some queries might be not available at now and need a small delay to become available, try to adjust it if you encounter this issue. Default: 0
      timeWindowOffset: "30"
      # Optional: The offset to retrieve the X to last data point. The value of last data point of some queries might be inaccurate, try to adjust to 1 if you encounter this issue. Default: 0
      lastAvailablePointOffset: "1"
    authenticationRef:
      name: keda-trigger-auth-datadog-secret
```

Check [here](https://github.com/kedacore/keda/pull/3954#discussion_r1042820206) for the details of this issue.
