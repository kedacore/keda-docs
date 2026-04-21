+++
title = "Autoscale an App"
description = "ScaledObject and InterceptorRoute configuration for autoscaling an HTTP service"
+++

This guide walks you through the two resources needed to autoscale an existing HTTP service with the KEDA HTTP Add-on: an `InterceptorRoute` and a KEDA `ScaledObject`.

## Prerequisites

- The HTTP Add-on is [installed](../operations/installation/) in your cluster.
- You have an existing Deployment (or other workload) and a Service for your HTTP application.

## Step 1: Create an InterceptorRoute

The `InterceptorRoute` tells the interceptor how to route requests to your service and what scaling metrics to report.

```yaml
apiVersion: http.keda.sh/v1beta1
kind: InterceptorRoute
metadata:
  name: <your-app>
  namespace: <your-namespace>
spec:
  target:
    service: <your-service>
    port: 80
  rules:
    - hosts:
        - <your-hostname>
  scalingMetric:
    concurrency:
      targetValue: 100
```

Key fields:

- **`target.service`** / **`target.port`** — The Kubernetes Service and port to route traffic to.
- **`rules[].hosts`** — Hostnames to match against the HTTP `Host` header. This must match what callers send (see [Step 4](#step-4-route-traffic-through-the-interceptor)):
  - External traffic: your public hostname (e.g., `app.example.com`).
  - In-cluster traffic: the service name callers use (e.g., `<your-service>-proxy`).
  - Wildcards like `*.example.com` are supported.
- **`scalingMetric.concurrency.targetValue`** — Target concurrent requests per replica. KEDA scales replicas so each handles approximately this many concurrent requests.

## Step 2: Create a ScaledObject

The `ScaledObject` tells KEDA how to scale your workload.
It references the HTTP Add-on's scaler using the `external-push` trigger type.

> **Create the ScaledObject after the InterceptorRoute.** When KEDA reconciles a ScaledObject with an `external-push` trigger, it calls the scaler's `GetMetricSpec` endpoint. If the InterceptorRoute does not exist yet, the scaler returns an empty metric spec and KEDA falls back to a default CPU metric in the HPA, which prevents scale-up from working.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: <your-app>
  namespace: <your-namespace>
spec:
  scaleTargetRef:
    name: <your-deployment>
  minReplicaCount: 0
  maxReplicaCount: 10
  cooldownPeriod: 300
  triggers:
    - type: external-push
      metadata:
        scalerAddress: keda-add-ons-http-external-scaler.keda:9090
        interceptorRoute: <your-app>
```

Key fields:

- **`scaleTargetRef.name`** — The name of the Deployment (or StatefulSet, etc.) to scale.
- **`minReplicaCount`** — Set to `0` for scale-to-zero, or higher to keep a minimum number of replicas running.
- **`maxReplicaCount`** — Upper bound for the number of replicas.
- **`cooldownPeriod`** — Seconds to wait before scaling down after traffic stops (default: `300`).
- **`scalerAddress`** — The HTTP Add-on scaler gRPC service address. If KEDA is installed in a namespace other than `keda`, adjust accordingly.
- **`interceptorRoute`** — Must match the `metadata.name` of the InterceptorRoute created in the previous step.

## Step 3: Verify

1. Check that the ScaledObject is ready:

   ```shell
   kubectl get scaledobject <your-app> -n <your-namespace>
   ```

   The `READY` column should show `True`.

2. Check that the InterceptorRoute is ready:

   ```shell
   kubectl get interceptorroute <your-app> -n <your-namespace>
   ```

   The `READY` column should show `True`.

## Step 4: Route Traffic Through the Interceptor

For autoscaling to work, traffic must flow through the interceptor instead of directly to your application.
This applies to both in-cluster and external traffic.

### In-cluster traffic

If other services in your cluster call your application directly, redirect them to the interceptor proxy service (`keda-add-ons-http-interceptor-proxy` in the `keda` namespace).

Create an `ExternalName` service in your application's namespace so callers can reach the interceptor:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: <your-service>-proxy
  namespace: <your-namespace>
spec:
  type: ExternalName
  externalName: keda-add-ons-http-interceptor-proxy.keda.svc.cluster.local
  ports:
    - port: 8080
```

Update callers to use `<your-service>-proxy` instead of `<your-service>`.
The `hosts` in your InterceptorRoute must include the hostname that callers use in the `Host` header — typically the service name (e.g., `<your-service>-proxy` or `<your-service>-proxy.<your-namespace>.svc.cluster.local`).

### External traffic

For traffic entering the cluster from outside, configure your ingress or gateway to point at the interceptor proxy service instead of your application.
See [Configure Ingress](../configure-ingress/) for Gateway API, Ingress, and Istio examples.

## What's Next

- **[Configure Routing Rules](../configure-routing/)** — Add path prefixes, wildcards, or header matching.
- **[Configure Scaling Metrics](../configure-scaling/)** — Switch to request rate or use both concurrency and rate metrics.
