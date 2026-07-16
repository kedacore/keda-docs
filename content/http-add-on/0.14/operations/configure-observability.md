+++
title = "Configure Observability"
description = "Prometheus metrics, OpenTelemetry tracing, and request logging configuration for the interceptor"
+++

The interceptor exposes metrics and tracing data to help monitor HTTP traffic and scaling behavior.
All observability settings are configured via environment variables, set through the `interceptor.extraEnvs` Helm value.

## Prometheus metrics

The interceptor exposes Prometheus metrics at `/metrics` on port `2223`.
This is enabled by default.

| Env var                      | Default | Description                               |
| ---------------------------- | ------- | ----------------------------------------- |
| `OTEL_PROM_EXPORTER_ENABLED` | `true`  | Enable the Prometheus metrics endpoint.   |
| `OTEL_PROM_EXPORTER_PORT`    | `2223`  | Port for the Prometheus metrics endpoint. |

See [Metrics Reference](../../reference/metrics/) for the full list of metrics and labels.

## OpenTelemetry tracing

Enable distributed tracing via OTLP:

```shell
helm upgrade http-add-on kedacore/keda-add-ons-http \
  --namespace keda \
  --set interceptor.extraEnvs.OTEL_EXPORTER_OTLP_TRACES_ENABLED=true \
  --set interceptor.extraEnvs.OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=grpc \
  --set interceptor.extraEnvs.OTEL_EXPORTER_OTLP_ENDPOINT=http://<your-otel-collector>:4317
```

The interceptor uses W3C TraceContext and Baggage propagation.

| Env var                              | Default   | Description                                             |
| ------------------------------------ | --------- | ------------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_TRACES_ENABLED`  | `false`   | Enable OTLP trace export.                               |
| `OTEL_EXPORTER_OTLP_TRACES_PROTOCOL` | `console` | Exporter protocol (`grpc`, `http/protobuf`, `console`). |
| `OTEL_EXPORTER_OTLP_ENDPOINT`        | —         | Collector endpoint URL.                                 |
| `OTEL_EXPORTER_OTLP_HEADERS`         | —         | Authentication headers (e.g., `api-key=<token>`).       |
| `OTEL_EXPORTER_OTLP_TRACES_TIMEOUT`  | `10s`     | Timeout for trace export requests.                      |

## OpenTelemetry metrics

Enable OTLP metrics export alongside or instead of Prometheus:

```shell
helm upgrade http-add-on kedacore/keda-add-ons-http \
  --namespace keda \
  --set interceptor.extraEnvs.OTEL_EXPORTER_OTLP_METRICS_ENABLED=true \
  --set interceptor.extraEnvs.OTEL_EXPORTER_OTLP_ENDPOINT=http://<your-otel-collector>:4317
```

| Env var                              | Default | Description                                         |
| ------------------------------------ | ------- | --------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_METRICS_ENABLED` | `false` | Enable OTLP metrics export.                         |
| `OTEL_EXPORTER_OTLP_ENDPOINT`        | —       | Collector endpoint URL (shared with traces if set). |
| `OTEL_EXPORTER_OTLP_HEADERS`         | —       | Authentication headers (shared with traces if set). |
| `OTEL_METRIC_EXPORT_INTERVAL`        | `60s`   | Interval between periodic metric exports.           |

## Request logging

Enable Combined Log Format request logging:

```shell
helm upgrade http-add-on kedacore/keda-add-ons-http \
  --namespace keda \
  --set interceptor.extraEnvs.KEDA_HTTP_LOG_REQUESTS=true
```

## What's Next

- [Metrics Reference](../../reference/metrics/) — detailed Prometheus metric definitions.
- [Environment Variables Reference](../../reference/environment-variables/) — all observability-related environment variables.
