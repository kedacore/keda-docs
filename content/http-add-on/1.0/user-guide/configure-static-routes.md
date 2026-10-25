+++
title = "Configure Static Routes"
description = "Serve static responses for health checks, maintenance pages, and other paths that should not trigger autoscaling"
+++

Some requests such as external health probes should never trigger autoscaling.
When the backend is scaled to zero, these requests still need a sensible response.
Static routes let you define paths on an InterceptorRoute that serve a configurable static response without waking up the backend.

## Health check passthrough

A common use case is a load balancer that probes `/healthz`.
When the app is running, the probe should reach the real backend.
When the app is scaled to zero, the interceptor returns a static `200 OK` instead of triggering a scale-up.

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
    requestRate:
      targetValue: 100
  staticRoutes:
    - rules:
        - paths:
            - value: /healthz
      response:
        statusCode: 200
        body: "OK"
```

With the default `responseMode: WhenUnavailable`, the interceptor forwards `/healthz` to the backend when it has ready endpoints.
When the backend is down, the static response is returned.

## Maintenance page

Serve a maintenance page when the backend is unavailable, without triggering a scale-up.
With `responseMode: Always`, the static response is returned even when the backend is running which is useful e.g. for a planned downtime.

For larger response bodies, store the content in a ConfigMap instead of inline.
The ConfigMap must have the label `http.keda.sh/response-body: "true"`.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: maintenance-page
  labels:
    http.keda.sh/response-body: "true"
data:
  index.html: |
    <!DOCTYPE html>
    <html>
      <body><h1>Under maintenance</h1></body>
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
    requestRate:
      targetValue: 100
  staticRoutes:
    - rules:
        - paths:
            - value: /
      responseMode: Always
      response:
        bodyFromConfigMap:
          name: maintenance-page
          key: index.html
        headers:
          Content-Type: text/html
        statusCode: 503
```

When `key` is omitted, it is derived from the request path (without the leading `/`, defaulting to `index.html` for `/`).
The `Content-Type` header is auto-detected from the key's file extension unless explicitly set in `headers`.

## Multiple static routes

You can define multiple static routes on a single InterceptorRoute.
They are evaluated in list order; the first matching route wins.

```yaml
staticRoutes:
  - rules:
      - paths:
          - value: /healthz
    response:
      statusCode: 200
      body: "OK"
  - rules:
      - paths:
          - value: /old-api
    responseMode: Always
    response:
      statusCode: 307
      headers:
        Location: /api
```

## Response modes

The `responseMode` field controls when the static response is served:

| Mode              | Behavior                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------- |
| `WhenUnavailable` | Forward to the backend when it has ready endpoints; return the static response only when the backend is down. |
| `Always`          | Always return the static response, even when the backend is running.                                          |

The default is `WhenUnavailable`, which suits health checks that should reach the real backend when it is available.
Use `Always` for redirects or paths that should never reach the backend.

## Matching rules

Static routes use the same matching rules as the top-level `rules` field on an InterceptorRoute: hosts, path prefixes, and headers.
Multiple rules within a single static route use OR semantics — a request matching any rule is handled by that static route.

For details on host, path, and header matching, see [Configure Routing Rules](../configure-routing/).

## Static routes vs. cold-start placeholders

Static routes and [cold-start placeholders](../configure-cold-start/) both serve static responses, but for different purposes:

- **Cold-start placeholders** respond to requests that _should_ trigger scaling. The placeholder is a temporary response while the backend starts up.
- **Static routes** respond to requests that should _never_ trigger scaling. Depending on `responseMode`, the static response is served when the backend is unavailable or unconditionally.

## What's Next

- [InterceptorRoute Reference](../reference/interceptorroute/) — field details for `staticRoutes`.
- [How Routing Works](../concepts/routing/) — request matching and priority order.
- [How Scaling Works](../concepts/scaling/) — metrics, scale-to-zero, and cold starts.
