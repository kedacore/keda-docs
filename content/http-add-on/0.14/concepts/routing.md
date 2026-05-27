+++
title = "Routing"
description = "Interceptor request matching using hostname, path, and header rules"
+++

The interceptor maintains an in-memory routing table that maps incoming HTTP requests to InterceptorRoute resources.
Each InterceptorRoute defines one or more routing rules, and each rule can match on three dimensions: hostname, path prefix, and headers.

## Routing Rules

An InterceptorRoute contains a list of routing rules in `spec.rules`.
Each rule specifies hosts, paths, and headers to match.
A request that matches any rule in the InterceptorRoute is forwarded to that InterceptorRoute's target service.

When a rule omits hosts, it matches any hostname (catch-all).
When it omits paths, it matches the root path `/`.
When it omits headers, no header matching is performed.

## Matching Dimensions

### Hostname Matching

The interceptor matches the `Host` header of the request against the hostnames declared in routing rules.
Three kinds of hostname values are supported:

- **Exact hostnames** (`api.example.com`)
  - Match the request hostname exactly.
  - Exact matches take priority over all wildcard forms.
- **Wildcard hostnames** (`*.example.com`)
  - The `*` replaces the first DNS label.
  - A wildcard matches any hostname that ends with the remaining labels: `*.example.com` matches `foo.example.com` and `foo.bar.example.com` (multi-level).
  - More specific wildcards take priority: `*.bar.example.com` wins over `*.example.com` for a request to `api.bar.example.com`.
- **Catch-all** (`*` or omitted)
  - Matches any hostname.
  - This is the lowest priority.

The interceptor evaluates hostnames in priority order: exact match first, then wildcards from most specific to least specific, then catch-all.

### Path Matching

The interceptor uses longest-prefix matching on the request path.
All paths are normalized by trimming leading and trailing slashes.

When multiple routes match on hostname, the route with the longest matching path prefix wins.
For example, a request to `/api/v1/users` matches a rule with path `/api/v1` over a rule with path `/api`.

The routing table uses a radix tree internally, which makes longest-prefix lookups efficient regardless of the number of routes.

### Header Matching

Header matching adds a further dimension of specificity.
A routing rule can declare one or more headers that the request must carry:

- **Exact value match** — The rule specifies both a header name and a value (e.g., `name: X-Route, value: canary`). The request must contain the header with that exact value.
- **Presence-only match** — The rule specifies a header name without a value (e.g., `name: X-Route`). The request must contain the header, but any value is accepted.

All headers in a single rule must match for the rule to apply (AND semantics).
If a rule declares no headers, it matches regardless of what headers the request carries.

## Priority Order

When multiple InterceptorRoutes match a request, the interceptor selects the most specific one using the following tiebreaking order:

1. **Most specific hostname** — Exact hostname wins over wildcard, which wins over catch-all. Among wildcards, more specific patterns (more labels) take priority.
2. **Longest path prefix** — A longer matching prefix wins.
3. **Most specific headers** — Routes with more header matchers take priority. Among routes with the same number of headers, routes with more exact-value matches (as opposed to presence-only matches) take priority.
4. **Oldest creation timestamp** — The InterceptorRoute created first wins.
5. **Lexicographic namespace/name** — Final tiebreaker using the resource's namespace and name in descending lexicographic order.

### Example

Consider three InterceptorRoutes:

| Route | Host              | Path      | Headers        |
| ----- | ----------------- | --------- | -------------- |
| A     | `api.example.com` | `/api`    | (none)         |
| B     | `*.example.com`   | `/api/v1` | `X-Version: 2` |
| C     | `api.example.com` | `/api/v1` | (none)         |

A request to `api.example.com` with path `/api/v1/users` and header `X-Version: 2`:

- Route A matches (exact host, path `/api` is a prefix).
- Route B matches (wildcard host, path `/api/v1` is a prefix, header matches).
- Route C matches (exact host, path `/api/v1` is a prefix).

Applying the priority rules: Routes A and C have an exact hostname, which beats B's wildcard.
Between A and C, C has the longer path prefix (`/api/v1` vs `/api`).
**Route C wins.**

## Multiple Rules per InterceptorRoute

A single InterceptorRoute can contain multiple routing rules.
Each rule independently specifies its own hosts, paths, and headers.
A request that matches any one of these rules is routed to the InterceptorRoute's target service.

This allows a single InterceptorRoute to serve traffic for multiple hostnames or path patterns without requiring separate resources for each.

## What's Next

- [Configure Routing Rules](../../user-guide/configure-routing/) — YAML examples for host, path, and header matching.
- [InterceptorRoute Reference](../../reference/interceptorroute/) — Complete field definitions for routing rules.
