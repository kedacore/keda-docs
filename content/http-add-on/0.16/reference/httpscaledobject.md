+++
title = "HTTPScaledObject (Deprecated)"
description = "Field-by-field API reference for the HTTPScaledObject custom resource"
+++

> **Deprecated:** HTTPScaledObject (v1alpha1) is deprecated.
> [InterceptorRoute](../interceptorroute/) (v1beta1) is the current API.
> See [Migrate from HTTPScaledObject to InterceptorRoute](../../operations/migrate-httpscaledobject-to-interceptorroute/) to upgrade.

|                 |                         |
| --------------- | ----------------------- |
| **API version** | `http.keda.sh/v1alpha1` |
| **Kind**        | `HTTPScaledObject`      |
| **Short name**  | `httpso`                |
| **Scope**       | Namespaced              |

## Example

```yaml
apiVersion: http.keda.sh/v1alpha1
kind: HTTPScaledObject
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - app.example.com
  pathPrefixes:
    - /api
  scaleTargetRef:
    name: my-app
    service: my-app-svc
    port: 8080
  replicas:
    min: 0
    max: 10
  scalingMetric:
    concurrency:
      targetValue: 100
```

## Annotations

| Annotation                                            | Value    | Description                                                                                                                                                          |
| ----------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `httpscaledobject.keda.sh/skip-scaledobject-creation` | `"true"` | Skip automatic ScaledObject creation. Set this when you want to integrate the HTTP scaler with other KEDA scalers in a single ScaledObject that you manage yourself. |
| `httpscaledobject.keda.sh/orphan-scaledobject`        | `"true"` | When the HTTPScaledObject is deleted, leave the generated ScaledObject in place instead of deleting it.                                                              |

When `skip-scaledobject-creation` is set to `"true"`, the operator does not create or manage a ScaledObject.
You can then create your own ScaledObject and add the HTTP external scaler as one of the triggers:

```yaml
triggers:
  - type: external-push
    metadata:
      httpScaledObject: <your-httpso-name>
      scalerAddress: keda-add-ons-http-external-scaler.keda:9090
```

> **Note:** The InterceptorRoute API does not use this annotation.
> InterceptorRoute separates routing from scaling by design — you always create your own ScaledObject.

## `spec`

| Field                         | Type                                                             | Required | Default | Description                                                                                                                                                           |
| ----------------------------- | ---------------------------------------------------------------- | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hosts`                       | `[]string`                                                       | No       |         | Hostnames to route. Requests whose `Host` header matches any entry (combined with `pathPrefixes`) are routed to the target.                                           |
| `pathPrefixes`                | `[]string`                                                       | No       |         | URL path prefixes to match. Combined with `hosts` for routing.                                                                                                        |
| `headers`                     | [`[]Header`](#header)                                            | No       |         | Custom headers for routing. After `hosts` and `pathPrefixes` match, requests must also match all listed headers. The interceptor uses the most specific header match. |
| `scaleTargetRef`              | [`ScaleTargetRef`](#scaletargetref)                              | Yes      |         | The target workload and service to scale and route to.                                                                                                                |
| `coldStartTimeoutFailoverRef` | [`*ColdStartTimeoutFailoverRef`](#coldstarttimeoutfailoverref)   | No       |         | Failover service to route to when the target is not available during cold start.                                                                                      |
| `replicas`                    | [`*ReplicaStruct`](#replicastruct)                               | No       |         | Minimum and maximum replica counts.                                                                                                                                   |
| `targetPendingRequests`       | `*int32`                                                         | No       | `100`   | **Deprecated.** Use `scalingMetric` instead. Target metric value for the HPA.                                                                                         |
| `scaledownPeriod`             | `*int32`                                                         | No       | `300`   | Cooldown period in seconds before resources scale down.                                                                                                               |
| `initialCooldownPeriod`       | `*int32`                                                         | No       | `0`     | Initial period in seconds before scaling begins.                                                                                                                      |
| `scalingMetric`               | [`*ScalingMetricSpec`](#scalingmetricspec)                       | No       |         | Configuration for the scaling metric. When empty, concurrency-based scaling is used.                                                                                  |
| `timeouts`                    | [`*HTTPScaledObjectTimeoutsSpec`](#httpscaledobjecttimeoutsspec) | No       |         | Per-object timeout overrides for the global interceptor timeouts.                                                                                                     |

### `ScaleTargetRef`

| Field        | Type     | Required | Default | Description                                                     |
| ------------ | -------- | -------- | ------- | --------------------------------------------------------------- |
| `name`       | `string` | No       |         | Name of the Deployment or StatefulSet to scale.                 |
| `apiVersion` | `string` | No       |         | API version of the target workload.                             |
| `kind`       | `string` | No       |         | Kind of the target workload.                                    |
| `service`    | `string` | Yes      |         | Name of the Kubernetes Service to route to.                     |
| `port`       | `int32`  | No       |         | Port number on the Service. Mutually exclusive with `portName`. |
| `portName`   | `string` | No       |         | Named port on the Service. Mutually exclusive with `port`.      |

**Validation:** Exactly one of `port` or `portName` must be set.

### `Header`

| Field   | Type      | Required | Default | Description                                                                                     |
| ------- | --------- | -------- | ------- | ----------------------------------------------------------------------------------------------- |
| `name`  | `string`  | Yes      |         | Name of the HTTP header. Minimum length: 1.                                                     |
| `value` | `*string` | No       |         | Value to match (exact match). If omitted, the header must be present but any value is accepted. |

### `ReplicaStruct`

| Field | Type     | Required | Default | Description            |
| ----- | -------- | -------- | ------- | ---------------------- |
| `min` | `*int32` | No       | `0`     | Minimum replica count. |
| `max` | `*int32` | No       | `100`   | Maximum replica count. |

### `ScalingMetricSpec`

`concurrency` and `requestRate` are mutually exclusive.
Setting both produces undefined behavior.
This differs from [InterceptorRoute](../interceptorroute/), which allows both to be set simultaneously.

| Field         | Type                                               | Required | Default | Description                                             |
| ------------- | -------------------------------------------------- | -------- | ------- | ------------------------------------------------------- |
| `concurrency` | [`*ConcurrencyMetricSpec`](#concurrencymetricspec) | No       |         | Scale based on concurrent requests.                     |
| `requestRate` | [`*RateMetricSpec`](#ratemetricspec)               | No       |         | Scale based on average request rate over a time window. |

### `ConcurrencyMetricSpec`

| Field         | Type  | Required | Default | Description                                  |
| ------------- | ----- | -------- | ------- | -------------------------------------------- |
| `targetValue` | `int` | No       | `100`   | Target concurrent request count per replica. |

### `RateMetricSpec`

| Field         | Type       | Required | Default | Description                            |
| ------------- | ---------- | -------- | ------- | -------------------------------------- |
| `targetValue` | `int`      | No       | `100`   | Target request rate per replica.       |
| `window`      | `Duration` | No       | `1m`    | Time window for rate calculation.      |
| `granularity` | `Duration` | No       | `1s`    | Time granularity for rate calculation. |

### `ColdStartTimeoutFailoverRef`

| Field            | Type     | Required | Default | Description                                             |
| ---------------- | -------- | -------- | ------- | ------------------------------------------------------- |
| `service`        | `string` | Yes      |         | Name of the failover Service to route to.               |
| `port`           | `int32`  | No       |         | Port number on the failover Service.                    |
| `portName`       | `string` | No       |         | Named port on the failover Service.                     |
| `timeoutSeconds` | `int32`  | No       | `30`    | Seconds to wait before routing to the failover service. |

**Validation:** Exactly one of `port` or `portName` must be set.

### `HTTPScaledObjectTimeoutsSpec`

| Field            | Type       | Required | Default                               | Description                                                                                                       |
| ---------------- | ---------- | -------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `conditionWait`  | `Duration` | No       | Global `KEDA_CONDITION_WAIT_TIMEOUT`  | Time to wait for the backing workload to reach 1 or more replicas before connecting and sending the HTTP request. |
| `responseHeader` | `Duration` | No       | Global `KEDA_RESPONSE_HEADER_TIMEOUT` | Time to wait for response headers after the HTTP request is sent to the backing application.                      |

## `status`

| Field            | Type                 | Description                                          |
| ---------------- | -------------------- | ---------------------------------------------------- |
| `targetWorkload` | `string`             | Resolved target workload reference.                  |
| `targetService`  | `string`             | Resolved target service reference.                   |
| `conditions`     | `[]metav1.Condition` | Conditions of the HTTPScaledObject. Keyed by `type`. |

### Condition types

| Type    | Description                                                           |
| ------- | --------------------------------------------------------------------- |
| `Ready` | Whether the HTTPScaledObject is fully reconciled and routing traffic. |
