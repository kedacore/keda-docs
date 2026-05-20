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
