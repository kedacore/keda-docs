+++
title = "InterceptorRoute"
description = "Field-by-field API reference for the InterceptorRoute custom resource"
+++

|                 |                        |
| --------------- | ---------------------- |
| **API version** | `http.keda.sh/v1beta1` |
| **Kind**        | `InterceptorRoute`     |
| **Scope**       | Namespaced             |

## Example

```yaml
apiVersion: http.keda.sh/v1beta1
kind: InterceptorRoute
metadata:
  name: my-app
  namespace: default
spec:
  target:
    service: my-app-svc
    port: 8080
  rules:
    - hosts:
        - app.example.com
      paths:
        - value: /api
  scalingMetric:
    concurrency:
      targetValue: 100
```

## `spec`

| Field           | Type                                                    | Required | Default | Description                                                        |
| --------------- | ------------------------------------------------------- | -------- | ------- | ------------------------------------------------------------------ |
| `target`        | [`TargetRef`](#targetref)                               | Yes      |         | Backend service to route traffic to.                               |
| `rules`         | [`[]RoutingRule`](#routingrule)                         | No       |         | Routing rules that define how requests are matched to this target. |
| `scalingMetric` | [`ScalingMetricSpec`](#scalingmetricspec)               | Yes      |         | Metric configuration for autoscaling.                              |
| `coldStart`     | [`ColdStartSpec`](#coldstartspec)                       | No       |         | Cold start behavior when scaling from zero.                        |
| `timeouts`      | [`InterceptorRouteTimeouts`](#interceptorroutetimeouts) | No       |         | Timeout configuration for request handling.                        |

For usage guidance, see [Configure Routing Rules](../../user-guide/configure-routing/) and [Configure Scaling Metrics](../../user-guide/configure-scaling/).

### `TargetRef`

Identifies a Service to route traffic to.
Exactly one of `port` or `portName` must be set.

| Field      | Type     | Required | Default | Description                                                                   |
| ---------- | -------- | -------- | ------- | ----------------------------------------------------------------------------- |
| `service`  | `string` | Yes      |         | Name of the Kubernetes Service. Minimum length: 1.                            |
| `port`     | `int32`  | No       |         | Port number on the Service (1--65535). Mutually exclusive with `portName`.    |
| `portName` | `string` | No       |         | Named port on the Service. Minimum length: 1. Mutually exclusive with `port`. |

**Validation:** Exactly one of `port` or `portName` must be set.
Setting both or neither produces a validation error.

### `RoutingRule`

Defines a set of matching criteria for routing requests.
All specified fields within a single rule use AND semantics (host AND path AND headers must match).
Multiple rules use OR semantics (any rule can match).

| Field     | Type                            | Required | Default | Description                                                                                                                                                                                                                                           |
| --------- | ------------------------------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hosts`   | `[]string`                      | No       |         | Hostnames to match. Wildcard patterns (e.g., `*.example.com`) are supported. A single `*` acts as a catch-all. Exact matches take priority over wildcards; more specific wildcards (e.g., `*.bar.example.com`) take priority over less specific ones. |
| `paths`   | [`[]PathMatch`](#pathmatch)     | No       |         | Path prefixes to match. When multiple paths match, the longest prefix wins.                                                                                                                                                                           |
| `headers` | [`[]HeaderMatch`](#headermatch) | No       |         | Headers that must all match the request (AND semantics).                                                                                                                                                                                              |

### `PathMatch`

| Field   | Type     | Required | Default | Description                                                                        |
| ------- | -------- | -------- | ------- | ---------------------------------------------------------------------------------- |
| `value` | `string` | Yes      |         | Path prefix to match against. The longest matching prefix wins. Minimum length: 1. |

### `HeaderMatch`

| Field   | Type      | Required | Default | Description                                                                                    |
| ------- | --------- | -------- | ------- | ---------------------------------------------------------------------------------------------- |
| `name`  | `string`  | Yes      |         | Name of the HTTP header. Minimum length: 1.                                                    |
| `value` | `*string` | No       |         | Value to match against (exact match). If omitted, matches any value for the given header name. |

### `ScalingMetricSpec`

Defines what metric drives autoscaling.
At least one of `concurrency` or `requestRate` must be set.
When both are set, both metrics are reported and KEDA scales based on whichever demands more replicas.

| Field         | Type                                               | Required | Default | Description                              |
| ------------- | -------------------------------------------------- | -------- | ------- | ---------------------------------------- |
| `concurrency` | [`*ConcurrencyTargetSpec`](#concurrencytargetspec) | No       |         | Scale based on concurrent request count. |
| `requestRate` | [`*RequestRateTargetSpec`](#requestratetargetspec) | No       |         | Scale based on request rate.             |

**Validation:** At least one of `concurrency` or `requestRate` must be set.

### `ConcurrencyTargetSpec`

| Field         | Type    | Required | Default | Description                                              |
| ------------- | ------- | -------- | ------- | -------------------------------------------------------- |
| `targetValue` | `int32` | Yes      |         | Target concurrent request count per replica. Minimum: 1. |

### `RequestRateTargetSpec`

| Field         | Type       | Required | Default | Description                                                    |
| ------------- | ---------- | -------- | ------- | -------------------------------------------------------------- |
| `targetValue` | `int32`    | Yes      |         | Target request rate per replica. Minimum: 1.                   |
| `window`      | `Duration` | No       | `1m`    | Sliding time window over which the request rate is calculated. |
| `granularity` | `Duration` | No       | `1s`    | Bucket size for rate calculation within the window.            |

### `ColdStartSpec`

Configures behavior while the target is not ready (scaling from zero).

| Field         | Type                                             | Required | Default | Description                                                                                          |
| ------------- | ------------------------------------------------ | -------- | ------- | ---------------------------------------------------------------------------------------------------- |
| `fallback`    | [`*ColdStartFallback`](#coldstartfallback)       | No       |         | Fallback service to route to when the target is scaling from zero and the readiness timeout expires. |
| `placeholder` | [`*ColdStartPlaceholder`](#coldstartplaceholder) | No       |         | Placeholder response to serve while the target has no ready endpoints.                               |

**Validation:** At least one of `fallback` or `placeholder` must be set.

When both are configured, the placeholder response is returned immediately while the backend scales up.
If the backend does not become ready within the readiness timeout, the fallback service is used.

### `ColdStartFallback`

| Field     | Type                         | Required | Default | Description                                       |
| --------- | ---------------------------- | -------- | ------- | ------------------------------------------------- |
| `service` | [`*ServiceRef`](#serviceref) | No       |         | Kubernetes Service to use as the fallback target. |

### `ServiceRef`

| Field      | Type     | Required | Default | Description                                                                   |
| ---------- | -------- | -------- | ------- | ----------------------------------------------------------------------------- |
| `name`     | `string` | Yes      |         | Name of the Kubernetes Service. Minimum length: 1.                            |
| `port`     | `int32`  | No       |         | Port number on the Service (1--65535). Mutually exclusive with `portName`.    |
| `portName` | `string` | No       |         | Named port on the Service. Minimum length: 1. Mutually exclusive with `port`. |

**Validation:** Exactly one of `port` or `portName` must be set.
Setting both or neither produces a validation error.

### `ColdStartPlaceholder`

| Field      | Type                                 | Required | Default | Description                                                                    |
| ---------- | ------------------------------------ | -------- | ------- | ------------------------------------------------------------------------------ |
| `response` | [`*StaticResponse`](#staticresponse) | Yes      |         | Static response to return immediately when the backend has no ready endpoints. |

### `StaticResponse`

Defines a static HTTP response.

| Field               | Type                                   | Required | Default | Description                                                                                                                                                   |
| ------------------- | -------------------------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `statusCode`        | `int32`                                | No       | `503`   | HTTP status code (100--599).                                                                                                                                  |
| `body`              | `*string`                              | No       |         | Inline response body. Maximum length: 32,768 characters. Mutually exclusive with `bodyFromConfigMap`.                                                         |
| `bodyFromConfigMap` | [`*ConfigMapKeyRef`](#configmapkeyref) | No       |         | Response body from a ConfigMap in the same namespace. The ConfigMap must have the label `http.keda.sh/response-body: "true"`. Mutually exclusive with `body`. |
| `headers`           | `map[string]string`                    | No       |         | HTTP response headers.                                                                                                                                        |

**Validation:** At most one of `body` or `bodyFromConfigMap` may be set.
If neither is set, the response has an empty body.

### `ConfigMapKeyRef`

References a key within a ConfigMap.

| Field  | Type     | Required | Default | Description                                                                                                                                                                                                                           |
| ------ | -------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name` | `string` | Yes      |         | Name of the ConfigMap. Minimum length: 1.                                                                                                                                                                                             |
| `key`  | `string` | No       |         | Key within the ConfigMap. When omitted, the key is derived from the request path (without leading `/`, defaulting to `index.html` for `/`). Content-Type is auto-detected from the file extension unless explicitly set in `headers`. |

### `InterceptorRouteTimeouts`

Configures per-route request handling timeouts.
When a field is unset, the global interceptor timeout configuration (`KEDA_HTTP_*_TIMEOUT` environment variables) is used.

| Field            | Type        | Required | Default                                    | Description                                                                                                                                                                                                                                                              |
| ---------------- | ----------- | -------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `readiness`      | `*Duration` | No       | Global `KEDA_HTTP_READINESS_TIMEOUT`       | Time to wait for the backend to become ready (e.g., scale from zero). Set to `0s` to disable the dedicated readiness deadline so the full request budget is available for cold starts. When a fallback service is configured and this is `0s`, a 30s default is applied. |
| `request`        | `*Duration` | No       | Global `KEDA_HTTP_REQUEST_TIMEOUT`         | Total time allowed for the entire request lifecycle. Set to `0s` to disable the request deadline.                                                                                                                                                                        |
| `responseHeader` | `*Duration` | No       | Global `KEDA_HTTP_RESPONSE_HEADER_TIMEOUT` | Maximum time to wait for response headers from the backend after the request has been sent. Does not include cold-start wait time. Set to `0s` to disable the response header deadline.                                                                                  |

## `status`

| Field        | Type                 | Description                                          |
| ------------ | -------------------- | ---------------------------------------------------- |
| `conditions` | `[]metav1.Condition` | Conditions of the InterceptorRoute. Keyed by `type`. |

### Condition types

| Type    | Description                                                           |
| ------- | --------------------------------------------------------------------- |
| `Ready` | Whether the InterceptorRoute is fully reconciled and routing traffic. |
