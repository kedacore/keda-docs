+++
title = "Scaling"
description = "HTTP Add-on scaling decisions, including metrics, scale-to-zero, and cold-start behavior"
+++

The HTTP Add-on provides two scaling metrics: concurrency and request rate.
KEDA uses these metrics to adjust the replica count of backend workloads through the Horizontal Pod Autoscaler (HPA).

## Scaling Metrics

### Concurrency

Concurrency measures the number of in-flight requests at any instant for a given route.
The interceptor increments a counter when a request arrives and decrements it when the response completes.

### Request Rate

Request rate measures the number of requests per second, averaged over a sliding time window.
The windowed averaging smooths out short bursts and provides a stable signal for scaling.

The default configuration is:

- **Window**: 1 minute
- **Granularity**: 1 second

### Using Both Metrics

When an InterceptorRoute specifies both concurrency and request rate targets, KEDA evaluates each metric independently and scales to whichever demands more replicas.
This is standard KEDA/HPA behavior: the metric requiring the highest replica count wins.

## The Scaling Formula

The desired replica count for a single metric follows the standard HPA formula:

```
desiredReplicas = ceil(currentMetricValue / targetValue)
```

For example, with a concurrency target of 100 and a current concurrency of 250, the desired count is `ceil(250 / 100) = 3`.

This calculation happens within the Kubernetes HPA based on the metrics and targets that KEDA provides.

## How Metrics Flow

1. A request arrives at the interceptor, which counts it.
2. The scaler periodically polls all interceptor pods to collect per-route request counts.
3. The scaler aggregates concurrency across pods and computes request rate for each route.
4. KEDA queries the scaler for current metrics and determines the desired replica count.
5. KEDA configures the HPA, which adjusts the backend's replica count.

## Scale-to-Zero

When all metrics for a route drop to zero and the ScaledObject's `cooldownPeriod` expires, KEDA scales the backend workload to zero replicas.

The `cooldownPeriod` is a field on the KEDA ScaledObject (not the InterceptorRoute).
It defines how long all metrics must remain at zero before KEDA scales the workload down to zero.

## Cold Starts

When a request arrives for a backend that has been scaled to zero, the interceptor holds the request while KEDA scales the backend up.
The sequence is:

1. The interceptor matches the request to a route and counts it.
2. The scaler detects incoming traffic and reports the workload as active to KEDA.
3. KEDA scales the backend workload from 0 to 1 or more replicas.
4. Once at least one backend pod is ready, the interceptor forwards the held request.
5. The response flows back through the interceptor to the client.

If the backend does not become ready within the readiness timeout, the interceptor either routes to a fallback service (if configured) or returns an error.
See [Configure Cold-Start Behavior](../../user-guide/configure-cold-start/) for fallback configuration and [Configure Timeouts](../../user-guide/configure-timeouts/) for timeout settings.

## What's Next

- [Configure Scaling Metrics](../../user-guide/configure-scaling/) — Choose between concurrency and request rate, and tune target values.
- [Configure Timeouts](../../user-guide/configure-timeouts/) — Set readiness timeouts per route.
- [Configure Cold-Start Behavior](../../user-guide/configure-cold-start/) — Fallback services and cold-start response headers.
- [Architecture](../architecture/) — Overview of the three components and how they interact.
