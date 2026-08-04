+++
title = "Configure the Interceptor"
description = "Timeout, connection, and scaling configuration for the interceptor proxy"
+++

The interceptor is the reverse proxy that sits in front of your application.
This page covers infrastructure-level settings configured via Helm values and environment variables.

## Timeouts

Global timeouts apply to all routes and serve as cluster-wide defaults.
Application developers can override these values per route on the `InterceptorRoute` — see [Configure Timeouts](../../user-guide/configure-timeouts/).

Set global defaults via Helm values:

```shell
helm install http-add-on kedacore/keda-add-ons-http \
  --namespace keda \
  --set interceptor.requestTimeout=30s \
  --set interceptor.responseHeaderTimeout=15s \
  --set interceptor.readinessTimeout=20s
```

| Timeout         | Helm value                          | Env var                             | Default                                                            |
| --------------- | ----------------------------------- | ----------------------------------- | ------------------------------------------------------------------ |
| Request         | `interceptor.requestTimeout`        | `KEDA_HTTP_REQUEST_TIMEOUT`         | `0s` (disabled — no total deadline)                                |
| Response header | `interceptor.responseHeaderTimeout` | `KEDA_HTTP_RESPONSE_HEADER_TIMEOUT` | `300s`                                                             |
| Readiness       | `interceptor.readinessTimeout`      | `KEDA_HTTP_READINESS_TIMEOUT`       | `0s` (disabled — readiness wait is bounded by the request timeout) |
| Connect         | `interceptor.tcpConnectTimeout`     | `KEDA_HTTP_CONNECT_TIMEOUT`         | `500ms`                                                            |

## Cold-start response header

The interceptor adds an `X-KEDA-HTTP-Cold-Start` response header to indicate whether a cold start occurred.
This header is enabled by default.
To disable it:

```shell
helm upgrade http-add-on kedacore/keda-add-ons-http \
  --namespace keda \
  --set interceptor.extraEnvs.KEDA_HTTP_ENABLE_COLD_START_HEADER=false
```

## Connection tuning

Configure the interceptor's connection pool for backend services:

| Helm value                        | Env var                             | Default | Description                                                                                                       |
| --------------------------------- | ----------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------- |
| `interceptor.maxIdleConns`        | `KEDA_HTTP_MAX_IDLE_CONNS`          | `1000`  | Maximum idle connections across all backend services. Increase this if you proxy to many backends.                |
| `interceptor.maxIdleConnsPerHost` | `KEDA_HTTP_MAX_IDLE_CONNS_PER_HOST` | `200`   | Maximum idle connections per backend. Increase this if you observe frequent connection establishments under load. |

## Graceful shutdown

During rolling updates, scale-downs, or node drains, the interceptor drains in-flight requests instead of terminating them immediately.
When an interceptor pod is deleted, Kubernetes triggers EndpointSlice removal and sends SIGTERM in parallel.
The interceptor's shutdown sequence on SIGTERM is:

1. The readiness probe returns 503, signaling the pod is no longer ready to receive traffic (e.g. for external load balancers that health-check the pod directly).
2. The interceptor keeps serving for `shutdownDelay`, allowing endpoint removal to propagate to all nodes.
3. The proxy listener closes and the interceptor waits up to `drainTimeout` for in-flight requests (including WebSocket connections) to complete.
4. Infrastructure components (admin server, metrics, routing table) shut down and the pod exits.

| Helm value                                  | Env var                    | Default | Description                                                                                                    |
| ------------------------------------------- | -------------------------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| `interceptor.shutdownDelay`                 | `KEDA_HTTP_SHUTDOWN_DELAY` | `5s`    | Time between SIGTERM and closing the proxy listener. Increase this if clients still hit the pod after SIGTERM. |
| `interceptor.drainTimeout`                  | `KEDA_HTTP_DRAIN_TIMEOUT`  | `30s`   | Maximum time to wait for in-flight requests to complete. `0` waits indefinitely.                               |
| `interceptor.terminationGracePeriodSeconds` | —                          | `45`    | Time Kubernetes waits before sending SIGKILL.                                                                  |

Ensure `terminationGracePeriodSeconds` is at least `shutdownDelay + drainTimeout` to avoid SIGKILL before drain completes.

```shell
helm upgrade http-add-on kedacore/keda-add-ons-http \
  --namespace keda \
  --set interceptor.shutdownDelay=10s \
  --set interceptor.drainTimeout=120s \
  --set interceptor.terminationGracePeriodSeconds=135
```

## Interceptor scaling

The interceptor itself is auto-scaled by KEDA via a `ScaledObject` created by the Helm chart.
Configure the interceptor's scaling bounds:

| Helm value                 | Default | Description                   |
| -------------------------- | ------- | ----------------------------- |
| `interceptor.replicas.min` | `3`     | Minimum interceptor replicas. |
| `interceptor.replicas.max` | `50`    | Maximum interceptor replicas. |

```shell
helm upgrade http-add-on kedacore/keda-add-ons-http \
  --namespace keda \
  --set interceptor.replicas.min=<your-min> \
  --set interceptor.replicas.max=<your-max>
```

## What's Next

- [Configure TLS](../configure-tls/) — TLS termination, certificates, and cipher suites.
- [Configure Observability](../configure-observability/) — Prometheus metrics, OpenTelemetry tracing, and request logging.
- [Environment Variables Reference](../../reference/environment-variables/) — all environment variables for each component.
