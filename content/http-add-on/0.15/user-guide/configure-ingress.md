+++
title = "Configure Ingress"
description = "Gateway API and Ingress configuration for interceptor proxy traffic"
+++

For the HTTP Add-on to intercept and scale your HTTP traffic, external requests must be routed to the **interceptor proxy service** (`keda-add-ons-http-interceptor-proxy`) instead of directly to your application.
The interceptor then forwards requests to your application based on the InterceptorRoute configuration.

The HTTP Add-on is ingress-agnostic — it works with any ingress controller or Gateway API implementation.

## Using Gateway API

[Gateway API](https://gateway-api.sigs.k8s.io/) is the recommended approach for new Kubernetes clusters.

### Step 1: Create an HTTPRoute

Create an HTTPRoute that sends traffic to the interceptor proxy service:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: <your-app>
  namespace: <your-namespace>
spec:
  parentRefs:
    - name: <your-gateway>
      namespace: <gateway-namespace>
  hostnames:
    - <your-hostname>
  rules:
    - backendRefs:
        - name: keda-add-ons-http-interceptor-proxy
          namespace: keda
          port: 8080
```

The `hostnames` in the HTTPRoute should match the `hosts` in your InterceptorRoute so the interceptor can route the request correctly.

### Step 2: Create a ReferenceGrant

Cross-namespace backend references require a `ReferenceGrant` in the `keda` namespace.
This grants the HTTPRoute's namespace permission to reference the interceptor service:

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-httproute-to-interceptor
  namespace: keda
spec:
  from:
    - group: gateway.networking.k8s.io
      kind: HTTPRoute
      namespace: <your-namespace>
  to:
    - group: ""
      kind: Service
      name: keda-add-ons-http-interceptor-proxy
```

If your HTTPRoute is in the same namespace as the interceptor (e.g., `keda`), you do not need a ReferenceGrant.

## Using Kubernetes Ingress

Create an Ingress resource that routes traffic to the interceptor proxy service:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: <your-app>
  namespace: keda
spec:
  rules:
    - host: <your-hostname>
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: keda-add-ons-http-interceptor-proxy
                port:
                  number: 8080
```

The Ingress resource should be in the same namespace as the interceptor service (default: `keda`).
If your Ingress must live in a different namespace, create an `ExternalName` Service to reference the interceptor across namespaces.

## Using Istio

Add the interceptor proxy service as a destination in your Istio `VirtualService`:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: <your-app>
  namespace: <your-namespace>
spec:
  hosts:
    - <your-hostname>
  gateways:
    - <your-gateway>
  http:
    - route:
        - destination:
            host: keda-add-ons-http-interceptor-proxy.keda.svc.cluster.local
            port:
              number: 8080
```

The `host` field uses the fully qualified service name because the VirtualService and the interceptor are in different namespaces.

> **Note:** Creating the ReferenceGrant shown in the Gateway API section is not required for Istio — Istio's VirtualService uses DNS-based service discovery, not Kubernetes cross-namespace backend references.

## Verifying Traffic Flow

1. Confirm the interceptor proxy service exists:

   ```shell
   kubectl get svc keda-add-ons-http-interceptor-proxy -n keda
   ```

2. Find your ingress endpoint.
   For Gateway API, check the Gateway's address:

   ```shell
   kubectl get gateway <your-gateway> -n <gateway-namespace> -o jsonpath='{.status.addresses[0].value}'
   ```

   For Ingress, check the Ingress address:

   ```shell
   kubectl get ingress <your-app> -n keda -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
   ```

3. Send a test request:

   ```shell
   curl http://<ingress-address>/
   ```

4. Verify the request reached your application by checking your application logs or response.

## What's Next

- [Architecture](../concepts/architecture/) — Understand how the interceptor fits into the request flow.
- [Autoscale an App](../autoscale-an-app/) — Create the ScaledObject and InterceptorRoute resources.
