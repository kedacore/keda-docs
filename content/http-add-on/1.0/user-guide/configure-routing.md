+++
title = "Configure Routing Rules"
description = "Host, path, and header matching rules on an InterceptorRoute"
+++

An `InterceptorRoute` uses **rules** to match incoming requests to a target service.
Each rule can match on hostnames, path prefixes, and headers.
A request that matches any rule in the list is routed to the target.

## Single host

Route all traffic for a single hostname:

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
  rules:
    - hosts:
        - api.example.com
```

## Multiple hosts

Route traffic for several hostnames to the same target:

```yaml
spec:
  rules:
    - hosts:
        - api.example.com
        - api.staging.example.com
```

## Wildcard hosts

Use a wildcard prefix to match any subdomain.
`*.example.com` matches `foo.example.com`, `bar.baz.example.com`, and so on.

```yaml
spec:
  rules:
    - hosts:
        - "*.example.com"
```

A single `*` acts as a catch-all that matches every hostname.

When multiple wildcard patterns match a request, more specific wildcards take priority.
For example, `*.bar.example.com` wins over `*.example.com`.
Exact matches always take priority over wildcards.

## Path prefixes

Add path prefixes to narrow a rule to specific URL paths:

```yaml
spec:
  rules:
    - hosts:
        - api.example.com
      paths:
        - value: /api/v1
        - value: /api/v2
```

When multiple path prefixes match, the longest prefix wins.
A request to `/api/v1/users` matches `/api/v1` over `/api`.

## Header matching

Headers use AND semantics — all specified headers must match for the rule to apply.

### Match by exact value

```yaml
spec:
  rules:
    - hosts:
        - api.example.com
      headers:
        - name: X-Route
          value: canary
```

### Match by presence

Omit the `value` field to match any request that includes the header, regardless of its value:

```yaml
spec:
  rules:
    - hosts:
        - api.example.com
      headers:
        - name: X-Route
```

## Multiple rules

An `InterceptorRoute` can have multiple rules.
A request matching **any** rule is routed to the same target:

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
  rules:
    - hosts:
        - api.example.com
      paths:
        - value: /api
    - hosts:
        - admin.example.com
```

In this example, requests to `api.example.com/api/*` and `admin.example.com/*` both route to the same service.

## Routing priority

When rules from different `InterceptorRoute` resources overlap, the interceptor evaluates them in priority order:

1. Exact host matches beat wildcards.
2. More specific wildcards beat less specific ones.
3. Longer path prefixes beat shorter ones.
4. Header-matching rules beat rules without headers.

For a detailed explanation, see [How Routing Works](../concepts/routing/).

## What's Next

- [InterceptorRoute Reference](../reference/interceptorroute/) — complete field definitions for rules, hosts, paths, and headers.
