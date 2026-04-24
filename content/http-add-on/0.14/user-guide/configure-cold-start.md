+++
title = "Configure Cold-Start Behavior"
description = "Fallback services and response headers for cold-start scenarios"
+++

When a request arrives for a backend that has been scaled to zero, the interceptor holds the request until the backend becomes ready.
You can configure a fallback service and a readiness timeout to control what happens if the backend takes too long to start.

## Cold-start fallback

When the readiness timeout expires during a cold start, the interceptor returns an error by default.
To serve requests from a fallback service instead, configure the `coldStart.fallback` field:

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
  coldStart:
    fallback:
      service: <your-fallback-service>
      port: <your-fallback-port>
  timeouts:
    readiness: 5s
```

When a fallback is configured but the readiness timeout is `0s` (disabled), a 30-second default readiness timeout is applied automatically.
This prevents the fallback from never being triggered.

## Cold-start response header

The interceptor adds an `X-KEDA-HTTP-Cold-Start` response header to indicate whether a cold start occurred:

- `X-KEDA-HTTP-Cold-Start: true` — the request triggered a scale-from-zero.
- `X-KEDA-HTTP-Cold-Start: false` — the backend was already running.

This header is enabled by default.
To disable it, see [Configure the Interceptor](../operations/configure-interceptor/#cold-start-response-header).

## What's Next

- [How Scaling Works](../concepts/scaling/) — cold-start mechanics and scale-from-zero behavior.
- [Configure Timeouts](../configure-timeouts/) — per-route timeout overrides.
- [InterceptorRoute Reference](../reference/interceptorroute/) — field details for `coldStart`.
