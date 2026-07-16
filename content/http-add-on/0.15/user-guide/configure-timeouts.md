+++
title = "Configure Timeouts"
description = "Per-route timeout configuration"
+++

You can override the cluster-wide timeout defaults on individual routes using the `InterceptorRoute` spec.
For global timeout defaults, see [Configure the Interceptor](../operations/configure-interceptor/#timeouts).

## Timeout types

| Timeout             | Description                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Request**         | Total deadline for the entire request lifecycle, from arrival to response completion.                                                |
| **Response header** | Maximum time to wait for the backend to send response headers after the request is forwarded. Does not include cold-start wait time. |
| **Readiness**       | Maximum time to wait for the backend to become ready during a cold start (scale from zero).                                          |

## Per-route overrides

Override timeouts for a specific route via the `InterceptorRoute` spec:

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
  timeouts:
    request: 60s
    responseHeader: 30s
    readiness: 10s
```

### Override semantics

- When a timeout field is **omitted** (not set) in the `InterceptorRoute`, the global default applies.
- When a timeout field is set to **`0s`**, that timeout is disabled for this route.
- When a timeout field is set to a **positive value**, it overrides the global default for this route.

## Timeout errors

When a timeout is exceeded, the interceptor returns one of these HTTP status codes:

| Condition                                        | HTTP status           |
| ------------------------------------------------ | --------------------- |
| Request timeout exceeded                         | `504 Gateway Timeout` |
| Response header timeout exceeded                 | `504 Gateway Timeout` |
| Readiness timeout exceeded (no fallback)         | `504 Gateway Timeout` |
| Backend error (non-timeout failure, no fallback) | `502 Bad Gateway`     |

## What's Next

- [Configure Cold-Start Behavior](../configure-cold-start/) — fallback services and cold-start response headers.
- [Configure the Interceptor](../operations/configure-interceptor/#timeouts) — global timeout defaults.
- [InterceptorRoute Reference](../reference/interceptorroute/) — field details for `timeouts`.
