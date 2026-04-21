+++
title = "Architecture"
description = "The three components of the HTTP Add-on, their responsibilities, and how they interact to scale HTTP workloads"
+++

## The Problem: HTTP Has No Queue

Event-driven scalers such as those for Kafka or RabbitMQ can read the number of pending messages directly from a broker.
HTTP has no equivalent concept: a request arrives, gets processed, and is gone.
There is nothing for an autoscaler to query.

The HTTP Add-on solves this by placing dedicated infrastructure in the request path.
An interceptor proxy sits in front of your application, counts requests as they flow through, and holds requests during cold starts while backends scale up.
A scaler component aggregates those counts into metrics that [KEDA](https://keda.sh/docs/) can use to drive the Horizontal Pod Autoscaler (HPA).

## KEDA Core Concepts

Before diving into the HTTP Add-on components, a few KEDA primitives are relevant:

- **ScaledObject** — A KEDA custom resource that binds a workload (Deployment, StatefulSet, etc.) to one or more scaling triggers. KEDA watches ScaledObjects and configures the Kubernetes HPA accordingly. See the [KEDA ScaledObject documentation](https://keda.sh/docs/latest/concepts/scaling-deployments/).
- **External scaler** — A gRPC service that KEDA calls to fetch custom metrics. The HTTP Add-on's scaler component implements this interface. See the [KEDA external scalers documentation](https://keda.sh/docs/latest/concepts/external-scalers/).
- **HPA** — The Kubernetes Horizontal Pod Autoscaler. KEDA creates and manages an HPA for each ScaledObject. The HPA adjusts replica counts based on the metrics KEDA feeds it.

## Component Overview

The HTTP Add-on consists of three components deployed into the cluster:

### Interceptor

The interceptor is a reverse proxy that sits in the request path between the ingress layer and the backend service.
It performs three functions:

1. **Routing** — Matches incoming requests to backend services based on hostname, path prefix, and headers. See [Routing](../routing/) for the matching model.
2. **Counting** — Tracks the number of concurrent (in-flight) requests and total request counts per route. These counters are the raw data the scaler uses to compute scaling metrics.
3. **Buffering** — During cold starts (when a backend has zero replicas), the interceptor holds the request open while waiting for the backend to become ready. Once at least one pod is available, the request is forwarded. If the backend does not become ready within the readiness timeout, the interceptor returns an error or routes to a fallback service if configured.

The interceptor forwards requests to the backend's Kubernetes Service, relying on standard Kubernetes service load balancing for distribution across pods.

The interceptor deployment is itself auto-scaled by KEDA via a ScaledObject created by the Helm chart.

### Scaler

The scaler is the bridge between the interceptor's in-memory counters and KEDA's scaling decisions.
It implements the KEDA external scaler interface.

The scaler periodically polls all interceptor pods to fetch per-route request counts.
It aggregates concurrency across pods for each route and computes request rate from the total request counters.
When KEDA queries the scaler, it returns these aggregated metrics so KEDA can adjust replica counts.

See [Scaling](../scaling/) for details on how these metrics drive scaling decisions.

### Operator

The operator is a Kubernetes controller manager that reconciles HTTP Add-on custom resources:

- **InterceptorRoute** (`http.keda.sh/v1beta1`) — Defines routing rules, scaling metrics, target service, and timeout/cold-start configuration in a single resource. Users pair it with a KEDA ScaledObject they create and manage.
- **HTTPScaledObject** (`http.keda.sh/v1alpha1`, deprecated) — Combines routing, scaling, and ScaledObject management in one resource. The operator automatically creates the corresponding ScaledObject.

See the [InterceptorRoute reference](../../reference/interceptorroute/) for the full API specification.

## Request Flow

```
+---------+     +-------------+     +---------+
| Ingress +---->| Interceptor +---->| Backend |
+---------+     +------+------+     +---------+
                       |
                  poll metrics
                       |
                +------+------+
                |   Scaler    |
                +------+------+
                       |
                  report metrics
                       |
                +------+------+
                |  KEDA Core  |
                +------+------+
                       |
                  adjust replicas
                       |
                +------+------+
                |     HPA     |
                +-------------+
```

1. External traffic enters the cluster through an ingress controller (or Gateway API) and is routed to the interceptor service.
2. The interceptor matches the request to a route, counts it, and forwards the request to the backend. If the backend has zero replicas, the interceptor holds the request until a pod becomes ready.
3. When the backend responds, the interceptor returns the response to the client.
4. The scaler polls the interceptor to aggregate request counts and compute rate metrics.
5. KEDA queries the scaler for current metrics and determines the desired replica count.
6. KEDA configures the HPA, which adjusts the backend's replica count.

## What's Next

- [Scaling](../scaling/) — How scaling decisions are made, including scale-to-zero and cold starts.
- [Routing](../routing/) — How requests are matched to InterceptorRoutes.
- [Install the HTTP Add-on](../../operations/installation/) — Install the HTTP Add-on via Helm.
