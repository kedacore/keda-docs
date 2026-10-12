+++
title = "Configure Session Persistence"
description = "Route the requests of a client session to the same backend pod"
+++

Some applications keep per-user state in memory, such as a login session or a shopping cart.
With multiple replicas, these applications need all requests of a client to reach the same pod.
Session persistence (also called sticky sessions) pins a client session to one backend pod using a cookie managed by the interceptor, while the app can still scale to and from zero.

## Enable session persistence

Add `sessionPersistence` to the `InterceptorRoute`:

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
  sessionPersistence:
    type: Cookie
```

`type` selects how the session is tracked and is required.
`Cookie` is currently the only type: the interceptor tracks the session with a cookie it manages.
Leaving `sessionPersistence` out disables session persistence.

Session persistence requires [direct pod routing](../operations/configure-interceptor/#direct-pod-routing), which is enabled by default.
If the interceptor runs with `KEDA_HTTP_DIRECT_POD_ROUTING=false`, `sessionPersistence` has no effect.

## How it works

1. The first request of a client goes to a random ready pod.
   The response carries a `Set-Cookie` header that identifies this pod.
2. Later requests with the cookie go to the same pod, as long as it is ready.
3. If the pod is gone (for example after a scale-down, a rollout, or a scale to zero), the request goes to a random ready pod and the cookie is replaced.

The cookie value is an opaque pod identifier and an issue timestamp; it does not expose pod names or IPs.
The interceptor stores no session state, so the number of sessions does not affect its memory usage.
Every interceptor replica can serve every session.

The interceptor only sets the cookie on responses from the backend.
Responses from a [cold-start fallback](../configure-cold-start/) or a [static route](../configure-static-routes/) never set or change it.

## Configure the cookie name

By default, the cookie is named `keda-session-` followed by a hash of the route's namespace and name, so routes that share a hostname don't overwrite each other's sessions.
Set `cookie.name` to choose a name:

```yaml
spec:
  sessionPersistence:
    type: Cookie
    cookie:
      name: my-app-session
```

Choose a name that your application doesn't use for its own cookies, and don't reuse it across routes on the same hostname.

The cookie always has `Path=/`, `HttpOnly`, and `SameSite=Lax`, and no `Max-Age`, so browsers drop it when the browser session ends.
It is marked `Secure` when the client request reached the interceptor over TLS or carries `X-Forwarded-Proto: https`.
If TLS terminates in front of the interceptor, make sure your ingress sets `X-Forwarded-Proto`.

## Limit the session lifetime

Sessions don't expire by default.
Set `absoluteTimeout` to assign a pod again once a session is older than the timeout:

```yaml
spec:
  sessionPersistence:
    type: Cookie
    absoluteTimeout: 30m
```

The interceptor enforces the timeout, with second precision.
The next request after the timeout goes to a random ready pod and receives a new cookie.
This also spreads long-lived sessions across pods that were added after the session started.
The minimum value is `1s`.

## Limitations

- **Routing, not state.**
  Session persistence keeps requests on the same pod, but it doesn't preserve application state.
  State is lost when a pod restarts, is replaced, or the app scales to zero.
  Store state that must survive these events outside the pod.
- **Scale-out only spreads new sessions.**
  Established sessions stay on their pod.
  After a scale from zero, most early sessions are pinned to the first ready pod.
  Use `absoluteTimeout` to move sessions over time.
- **Endpoint propagation.**
  Each interceptor replica learns about pods from EndpointSlices.
  A replica that hasn't seen a new pod yet assigns a different pod, and that assignment sticks.
- **Unresponsive pods.**
  A pod that is still listed as ready but doesn't respond is retried until the request times out; the session moves only once the pod is no longer ready.
- **Shared caches.**
  A shared HTTP cache in front of the interceptor can serve one response with its `Set-Cookie` header to many clients and pin them all to the same pod.
  Make sure such responses aren't cached.
- **Non-browser clients.**
  Clients must store and send cookies, which gRPC and many HTTP clients don't do by default.

## What's Next

- [InterceptorRoute Reference](../reference/interceptorroute/#sessionpersistence) — field details for `sessionPersistence`.
- [Configure the Interceptor](../operations/configure-interceptor/#direct-pod-routing) — direct pod routing.
