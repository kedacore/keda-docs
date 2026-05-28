+++
title = "Configure Scaling Metrics"
description = "Autoscaling metric configuration on an InterceptorRoute"
+++

The `scalingMetric` field on an `InterceptorRoute` determines what metric drives autoscaling.
You can scale based on concurrent request count, request rate, or both.
At least one metric must be set.

## Concurrency metric

Scale based on the number of in-flight requests per replica:

```yaml
apiVersion: http.keda.sh/v1beta1
kind: InterceptorRoute
metadata:
  name: my-app
spec:
  target:
    service: <your-service>
    port: <your-port>
  scalingMetric:
    concurrency:
      targetValue: 100
```

The add-on targets `targetValue` concurrent requests per replica.
When the total concurrent requests across all replicas exceeds `replicas * targetValue`, KEDA scales up.

| Field         | Required | Description                                  |
| ------------- | -------- | -------------------------------------------- |
| `targetValue` | Yes      | Target concurrent request count per replica. |

## Request rate metric

Scale based on requests per second, averaged over a sliding window:

```yaml
apiVersion: http.keda.sh/v1beta1
kind: InterceptorRoute
metadata:
  name: my-app
spec:
  target:
    service: <your-service>
    port: <your-port>
  scalingMetric:
    requestRate:
      targetValue: 100
      window: 1m
      granularity: 1s
```

| Field         | Required | Description                                                                                                                   |
| ------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `targetValue` | Yes      | Target requests per second per replica.                                                                                       |
| `window`      | `1m`     | Sliding time window over which the average request rate is calculated.                                                        |
| `granularity` | `1s`     | Bucket size within the window. Smaller granularity gives more responsive scaling at the cost of higher sensitivity to bursts. |

## Using both metrics

An `InterceptorRoute` can set both `concurrency` and `requestRate`.
KEDA scales to whichever metric demands more replicas.

```yaml
apiVersion: http.keda.sh/v1beta1
kind: InterceptorRoute
metadata:
  name: my-app
spec:
  target:
    service: <your-service>
    port: <your-port>
  scalingMetric:
    concurrency:
      targetValue: 50
    requestRate:
      targetValue: 200
```

This is useful when you want to handle both sustained throughput (rate) and bursty traffic (concurrency).

## Scaling boundaries and cooldown

Minimum and maximum replica counts and cooldown are set on the KEDA `ScaledObject`, not the `InterceptorRoute`:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: my-app
spec:
  scaleTargetRef:
    name: <your-deployment>
  minReplicaCount: 0 # 0 enables scale-to-zero
  maxReplicaCount: 10
  cooldownPeriod: 300 # seconds before scaling to zero after traffic stops
```

Setting `minReplicaCount: 0` enables scale-to-zero.
The `cooldownPeriod` controls how long KEDA waits after the last request before scaling the workload down to zero replicas.

## What's Next

- [How Scaling Works](../concepts/scaling/) — the full scaling mechanics, including scale-to-zero and cold starts.
- [InterceptorRoute Reference](../reference/interceptorroute/) — field details for `scalingMetric`, `concurrency`, and `requestRate`.
