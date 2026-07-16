+++
title = "Metrics"
description = "Reference for all Prometheus metrics exposed by the HTTP Add-on"
+++

The interceptor exposes metrics via OpenTelemetry, with a Prometheus-compatible endpoint enabled by default.

## Endpoint configuration

| Setting | Default    | Description                                    |
| ------- | ---------- | ---------------------------------------------- |
| Port    | `2223`     | Configurable via `OTEL_PROM_EXPORTER_PORT`.    |
| Path    | `/metrics` | Standard Prometheus scrape path.               |
| Enabled | `true`     | Configurable via `OTEL_PROM_EXPORTER_ENABLED`. |

The interceptor also supports OTLP metric export.
See [Environment Variables](../environment-variables/#metrics) for configuration.

## Metrics

### Request count

|                          |                                                    |
| ------------------------ | -------------------------------------------------- |
| **Prometheus name**      | `interceptor_request_count_total`                  |
| **OTel instrument name** | `interceptor.request.count`                        |
| **Type**                 | Counter                                            |
| **Description**          | Total requests processed by the interceptor proxy. |

**Labels:**

| Label             | Description                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `code`            | HTTP response status code (integer).                                                                                      |
| `method`          | HTTP request method. Non-standard methods are normalized to `_OTHER` (see [Method normalization](#method-normalization)). |
| `route_name`      | Name of the matched InterceptorRoute or HTTPScaledObject.                                                                 |
| `route_namespace` | Namespace of the matched route resource.                                                                                  |

### Request concurrency

|                          |                                                        |
| ------------------------ | ------------------------------------------------------ |
| **Prometheus name**      | `interceptor_request_concurrency`                      |
| **OTel instrument name** | `interceptor.request.concurrency`                      |
| **Type**                 | UpDownCounter (gauge)                                  |
| **Description**          | Requests currently in-flight at the interceptor proxy. |

**Labels:**

| Label             | Description                                               |
| ----------------- | --------------------------------------------------------- |
| `route_name`      | Name of the matched InterceptorRoute or HTTPScaledObject. |
| `route_namespace` | Namespace of the matched route resource.                  |

### Request duration

|                          |                                                 |
| ------------------------ | ----------------------------------------------- |
| **Prometheus name**      | `interceptor_request_duration_seconds`          |
| **OTel instrument name** | `interceptor.request.duration`                  |
| **Type**                 | Histogram                                       |
| **Unit**                 | Seconds                                         |
| **Description**          | Time from request received to response written. |

**Bucket boundaries:** `0.005`, `0.01`, `0.025`, `0.05`, `0.075`, `0.1`, `0.25`, `0.5`, `0.75`, `1`, `2.5`, `5`, `7.5`, `10` (following the [OTel HTTP semantic conventions](https://opentelemetry.io/docs/specs/semconv/http/http-metrics/)).

**Labels:**

| Label             | Description                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `code`            | HTTP response status code (integer).                                                                                      |
| `method`          | HTTP request method. Non-standard methods are normalized to `_OTHER` (see [Method normalization](#method-normalization)). |
| `route_name`      | Name of the matched InterceptorRoute or HTTPScaledObject.                                                                 |
| `route_namespace` | Namespace of the matched route resource.                                                                                  |

## Method normalization

The `method` label accepts the following standard HTTP methods without modification:

`CONNECT`, `DELETE`, `GET`, `HEAD`, `OPTIONS`, `PATCH`, `POST`, `PUT`, `TRACE`

All other method values are replaced with `_OTHER` to prevent unbounded label cardinality.
