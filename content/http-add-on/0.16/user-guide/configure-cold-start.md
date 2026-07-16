+++
title = "Configure Cold-Start Behavior"
description = "Placeholder responses, fallback services, and response headers for cold-start scenarios"
+++

When a request arrives for a backend that has been scaled to zero, the interceptor holds the request until the backend becomes ready.
You can configure a placeholder response, a fallback service, or both to control what happens during a cold start.

## Placeholder response

The interceptor can return a static HTTP response immediately while the backend scales up, instead of holding the request.
Configure the `coldStart.placeholder` field to enable this:

```yaml
apiVersion: http.keda.sh/v1beta1
kind: InterceptorRoute
metadata:
  name: my-app
spec:
  target:
    service: my-app-svc
    port: 8080
  scalingMetric:
    concurrency:
      targetValue: 100
  coldStart:
    placeholder:
      response:
        body: "<h1>Loading...</h1>"
        headers:
          Content-Type: text/html
          Refresh: "5"
        statusCode: 503
```

The `Refresh` header tells the browser to reload the page after 5 seconds, so the user automatically sees the real page once the backend is ready.

### Response body from a ConfigMap

For larger or more complex responses, store the body in a ConfigMap in the same namespace instead of inline.
The ConfigMap must have the label `http.keda.sh/response-body: "true"`.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: placeholder-page
  labels:
    http.keda.sh/response-body: "true"
data:
  index.html: |
    <!DOCTYPE html>
    <html>
      <body>
        <h1>Loading, please wait...</h1>
      </body>
    </html>
---
apiVersion: http.keda.sh/v1beta1
kind: InterceptorRoute
metadata:
  name: my-app
spec:
  target:
    service: my-app-svc
    port: 8080
  scalingMetric:
    concurrency:
      targetValue: 100
  coldStart:
    placeholder:
      response:
        bodyFromConfigMap:
          name: placeholder-page
          key: index.html
        headers:
          Refresh: "5"
        statusCode: 503
```

When the `key` is omitted, it is derived from the request path (without the leading `/`, defaulting to `index.html` for `/`).
This lets a single ConfigMap serve different files for different paths.
The `Content-Type` header is auto-detected from the key's file extension unless explicitly set in `headers`.

### Placeholder defaults

- **Status code:** defaults to `503` when not specified.
- **Body:** defaults to an empty body when neither `body` nor `bodyFromConfigMap` is set.

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
      service:
        name: <your-fallback-service>
        port: <your-fallback-port>
  timeouts:
    readiness: 5s
```

When a fallback is configured but the readiness timeout is `0s` (disabled), a 30-second default readiness timeout is applied automatically.
This prevents the fallback from never being triggered.

## Combining placeholder and fallback

You can configure both a placeholder response and a fallback service.
When both are set, the placeholder response is returned immediately while the backend scales up.
If the backend does not become ready within the readiness timeout, subsequent requests are routed to the fallback service.

```yaml
coldStart:
  placeholder:
    response:
      body: "<h1>Loading...</h1>"
      headers:
        Content-Type: text/html
        Refresh: "5"
      statusCode: 503
  fallback:
    service:
      name: fallback-svc
      port: 8080
```

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
