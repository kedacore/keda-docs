+++
title = "Environment Variables"
description = "Reference for all environment variables accepted by each component"
+++

Environment variables configure runtime behavior for each HTTP Add-on component.
These are set via the `extraEnvs` Helm value for each component or directly in the container spec.

## Interceptor

### Serving

| Variable                                            | Default      | Description                                                                                   |
| --------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------- |
| `KEDA_HTTP_PROXY_PORT`                              | _(required)_ | Port for the public proxy server.                                                             |
| `KEDA_HTTP_ADMIN_PORT`                              | _(required)_ | Port for the internal admin server (metrics RPC endpoint for the scaler).                     |
| `KEDA_HTTP_WATCH_NAMESPACE`                         | `""`         | Namespace to watch for HTTPScaledObjects and InterceptorRoutes. Empty watches all namespaces. |
| `KEDA_HTTP_SCALER_CONFIG_MAP_INFORMER_RSYNC_PERIOD` | `60m`        | Resync interval for the controller-runtime cache.                                             |
| `KEDA_HTTP_ENABLE_COLD_START_HEADER`                | `true`       | When enabled, the interceptor adds the `X-KEDA-HTTP-Cold-Start` response header.              |
| `KEDA_HTTP_LOG_REQUESTS`                            | `false`      | Enable logging of incoming requests.                                                          |

### Timeouts

| Variable                            | Default | Description                                                                                                                                                                                                                                         |
| ----------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `KEDA_HTTP_REQUEST_TIMEOUT`         | `0s`    | Total request lifecycle deadline. `0s` disables the deadline.                                                                                                                                                                                       |
| `KEDA_HTTP_RESPONSE_HEADER_TIMEOUT` | `300s`  | Time to wait for response headers from the backend after the request is sent. `0s` disables the deadline.                                                                                                                                           |
| `KEDA_HTTP_READINESS_TIMEOUT`       | `0s`    | Time to wait for the backing workload to reach 1 or more replicas. `0s` disables the dedicated readiness deadline, giving the full request budget to cold starts. When a fallback service is configured and this is `0s`, a 30s default is applied. |
| `KEDA_HTTP_CONNECT_TIMEOUT`         | `500ms` | Per-attempt TCP dial timeout. Bounded by the request context deadline.                                                                                                                                                                              |
| `KEDA_HTTP_MAX_IDLE_CONNS`          | `1000`  | Maximum idle connections in the connection pool across all backend services.                                                                                                                                                                        |
| `KEDA_HTTP_MAX_IDLE_CONNS_PER_HOST` | `200`   | Maximum idle connections per backend service.                                                                                                                                                                                                       |
| `KEDA_HTTP_FORCE_HTTP2`             | `false` | Whether to force HTTP/2 for all proxied requests.                                                                                                                                                                                                   |

#### Deprecated timeout variables

These deprecated variables are still accepted.
When set, they take precedence over their replacements.

| Deprecated Variable            | Replacement                         | Description                                                       |
| ------------------------------ | ----------------------------------- | ----------------------------------------------------------------- |
| `KEDA_CONDITION_WAIT_TIMEOUT`  | `KEDA_HTTP_READINESS_TIMEOUT`       | Time to wait for the backing workload to have 1 or more replicas. |
| `KEDA_RESPONSE_HEADER_TIMEOUT` | `KEDA_HTTP_RESPONSE_HEADER_TIMEOUT` | Time to wait for response headers from the backend.               |

### TLS

| Variable                                | Default          | Description                                                                                     |
| --------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------- |
| `KEDA_HTTP_PROXY_TLS_ENABLED`           | `false`          | Enable TLS on the proxy server.                                                                 |
| `KEDA_HTTP_PROXY_TLS_CERT_PATH`         | `/certs/tls.crt` | Path to the TLS certificate file.                                                               |
| `KEDA_HTTP_PROXY_TLS_KEY_PATH`          | `/certs/tls.key` | Path to the TLS private key file.                                                               |
| `KEDA_HTTP_PROXY_TLS_CERT_STORE_PATHS`  | `""`             | Comma-separated list of paths to certificate/key pairs.                                         |
| `KEDA_HTTP_PROXY_TLS_SKIP_VERIFY`       | `false`          | Skip TLS verification for upstream connections.                                                 |
| `KEDA_HTTP_PROXY_TLS_PORT`              | `8443`           | Port for the TLS proxy server.                                                                  |
| `KEDA_HTTP_PROXY_TLS_MIN_VERSION`       | `""`             | Minimum TLS version (`1.2` or `1.3`). Empty uses the Go default (TLS 1.2).                      |
| `KEDA_HTTP_PROXY_TLS_MAX_VERSION`       | `""`             | Maximum TLS version (`1.2` or `1.3`). Empty uses the highest version supported by `crypto/tls`. |
| `KEDA_HTTP_PROXY_TLS_CIPHER_SUITES`     | `""`             | Comma-separated list of TLS cipher suite names. Empty uses Go defaults.                         |
| `KEDA_HTTP_PROXY_TLS_CURVE_PREFERENCES` | `""`             | Comma-separated list of elliptic curve names. Empty uses Go defaults.                           |

### Metrics

| Variable                             | Default | Description                                          |
| ------------------------------------ | ------- | ---------------------------------------------------- |
| `OTEL_PROM_EXPORTER_ENABLED`         | `true`  | Enable the Prometheus metrics exporter.              |
| `OTEL_PROM_EXPORTER_PORT`            | `2223`  | Port for the Prometheus-compatible metrics endpoint. |
| `OTEL_EXPORTER_OTLP_METRICS_ENABLED` | `false` | Enable the OTLP metrics exporter.                    |

### Tracing

| Variable                             | Default   | Description                                                                  |
| ------------------------------------ | --------- | ---------------------------------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_TRACES_ENABLED`  | `false`   | Enable OpenTelemetry trace export.                                           |
| `OTEL_EXPORTER_OTLP_TRACES_PROTOCOL` | `console` | Trace exporter protocol. Must be one of: `console`, `http/protobuf`, `grpc`. |

### Profiling

| Variable                 | Default | Description                                                             |
| ------------------------ | ------- | ----------------------------------------------------------------------- |
| `PROFILING_BIND_ADDRESS` | `""`    | Address (`host:port`) for the pprof endpoint. Empty disables profiling. |

## Scaler

| Variable                                            | Default      | Description                                                                         |
| --------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------- |
| `KEDA_HTTP_SCALER_PORT`                             | `8080`       | Port for the KEDA-compatible gRPC external scaler interface.                        |
| `KEDA_HTTP_SCALER_TARGET_ADMIN_NAMESPACE`           | _(required)_ | Namespace where the scaler and interceptors are running.                            |
| `KEDA_HTTP_SCALER_TARGET_ADMIN_SERVICE`             | _(required)_ | Name of the interceptor admin Service to issue metrics RPC requests to.             |
| `KEDA_HTTP_SCALER_TARGET_ADMIN_DEPLOYMENT`          | _(required)_ | Name of the interceptor Deployment to issue metrics RPC requests to.                |
| `KEDA_HTTP_SCALER_TARGET_ADMIN_PORT`                | _(required)_ | Port on the interceptor admin Service for metrics RPC requests.                     |
| `KEDA_HTTP_SCALER_CONFIG_MAP_INFORMER_RSYNC_PERIOD` | `60m`        | Resync interval for the controller-runtime cache.                                   |
| `KEDA_HTTP_QUEUE_TICK_DURATION`                     | `500ms`      | Duration between queue polling ticks.                                               |
| `KEDA_HTTP_SCALER_STREAM_INTERVAL_MS`               | `200`        | Interval in milliseconds between stream ticks for `IsActive` communication to KEDA. |
| `PROFILING_BIND_ADDRESS`                            | `""`         | Address (`host:port`) for the pprof endpoint. Empty disables profiling.             |

## Operator

| Variable                                            | Default      | Description                                                                         |
| --------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------- |
| `KEDAHTTP_OPERATOR_EXTERNAL_SCALER_SERVICE`         | _(required)_ | Name of the Kubernetes Service for the external scaler.                             |
| `KEDAHTTP_OPERATOR_EXTERNAL_SCALER_PORT`            | `8091`       | Port for the external scaler Service.                                               |
| `KEDA_HTTP_OPERATOR_NAMESPACE`                      | `""`         | Namespace in which the operator is running.                                         |
| `KEDA_HTTP_OPERATOR_WATCH_NAMESPACE`                | `""`         | Namespace to watch for resources. Empty watches all namespaces.                     |
| `KEDA_HTTP_OPERATOR_LEADER_ELECTION_LEASE_DURATION` | _(unset)_    | Leader election lease duration. When unset, the controller-runtime default is used. |
| `KEDA_HTTP_OPERATOR_LEADER_ELECTION_RENEW_DEADLINE` | _(unset)_    | Leader election renew deadline. When unset, the controller-runtime default is used. |
| `KEDA_HTTP_OPERATOR_LEADER_ELECTION_RETRY_PERIOD`   | _(unset)_    | Leader election retry period. When unset, the controller-runtime default is used.   |
