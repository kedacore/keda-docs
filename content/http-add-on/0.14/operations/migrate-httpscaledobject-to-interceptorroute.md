+++
title = "Migrate from HTTPScaledObject to InterceptorRoute"
description = "How to migrate existing HTTPScaledObject resources to the InterceptorRoute API"
+++

This guide shows you how to migrate existing `HTTPScaledObject` (v1alpha1) resources to the `InterceptorRoute` (v1beta1) API.

## Prerequisites

- KEDA HTTP Add-on v0.14.0 or later deployed on the cluster
- `kubectl` access to the cluster
- Existing `HTTPScaledObject` resources to migrate

## What changed

The `InterceptorRoute` API replaces `HTTPScaledObject` with a cleaner separation of concerns.

- **Manual ScaledObject management:**
  The `InterceptorRoute` controller no longer creates a KEDA `ScaledObject` for you.
  You create and manage it yourself, with access to all supported KEDA ScaledObject fields.
- **Multiple routing rules:**
  A new `rules[]` structure lets you define multiple routing rules on a single resource, each with its own hosts, paths, and headers.
- **Target reference for routing only:**
  The target reference contains only `service` and `port`/`portName`.
  Workload fields (`name`, `apiVersion`, `kind`) move to the `ScaledObject` where they belong.
- **Flexible scaling metrics:**
  Concurrency and request rate can be used independently or together.
  When both are set, KEDA scales based on whichever metric demands more replicas.
- **Granular timeouts:**
  A new `request` timeout controls the full request lifecycle.
  `conditionWait` is renamed to `readiness` for clarity.
- **`targetValue` is required:**
  On `HTTPScaledObject`, `targetValue` defaulted to `100` when omitted.
  On `InterceptorRoute`, `targetValue` must be set explicitly.
  If your `HTTPScaledObject` relied on the default, add `targetValue: 100` (or your preferred value) when migrating.
- **Scaling fields move to ScaledObject:**
  `replicas`, `targetPendingRequests`, `scaledownPeriod`, and `initialCooldownPeriod` are configured on the KEDA `ScaledObject` directly.

## Convert an HTTPScaledObject to an InterceptorRoute

The migration is a direct field-by-field conversion.
The [Apply the migration without downtime](#apply-the-migration-without-downtime) section below shows how to perform the switchover without interrupting traffic.

### Before: HTTPScaledObject

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
    - /health
  headers:
    - name: X-Custom-Header
      value: "my-value"
  scaleTargetRef:
    name: my-app
    kind: Deployment
    apiVersion: apps/v1
    service: my-app-svc
    port: 8080
  coldStartTimeoutFailoverRef:
    service: fallback-svc
    port: 8080
    timeoutSeconds: 45
  replicas:
    min: 0
    max: 10
  scalingMetric:
    concurrency:
      targetValue: 50
  timeouts:
    conditionWait: 30s
    responseHeader: 10s
  scaledownPeriod: 120
```

### After: InterceptorRoute and ScaledObject

The single `HTTPScaledObject` becomes two resources: an `InterceptorRoute` for routing and an independently managed `ScaledObject` for scaling.

**InterceptorRoute:**

```yaml
apiVersion: http.keda.sh/v1beta1
kind: InterceptorRoute
metadata:
  name: my-app
  namespace: default
spec:
  target:
    service: my-app-svc
    port: 8080
  coldStart:
    fallback:
      service: fallback-svc
      port: 8080
  rules:
    - hosts:
        - app.example.com
      paths:
        - value: /api
        - value: /health
      headers:
        - name: X-Custom-Header
          value: "my-value"
  scalingMetric:
    concurrency:
      targetValue: 50
  timeouts:
    readiness: 45s
    responseHeader: 10s
```

**ScaledObject:**

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: my-app
  namespace: default
spec:
  scaleTargetRef:
    name: my-app
    kind: Deployment
    apiVersion: apps/v1
  minReplicaCount: 0
  maxReplicaCount: 10
  cooldownPeriod: 120
  triggers:
    - type: external-push
      metadata:
        scalerAddress: "keda-add-ons-http-external-scaler.keda:9090"
        interceptorRoute: "my-app"
```

Note the following conversions:

1. `scaleTargetRef` becomes `target` with only `service` and `port`/`portName`.
2. `hosts`, `pathPrefixes`, and `headers` move into a `rules[]` entry.
3. `pathPrefixes` entries become `paths` entries, each with a `value` field.
4. `coldStartTimeoutFailoverRef` splits: the service reference moves to `coldStart.fallback`, and `timeoutSeconds` moves to `timeouts.readiness` as a duration string (`"45s"`).
5. `replicas`, `scaledownPeriod`, and `initialCooldownPeriod` move to the `ScaledObject`.
6. The workload reference (`name`, `apiVersion`, `kind`) moves to the `ScaledObject`'s `scaleTargetRef`.

## Apply the migration without downtime

The `HTTPScaledObject` controller sets an owner reference on the KEDA `ScaledObject` it creates.
Deleting the `HTTPScaledObject` triggers Kubernetes garbage collection, which cascade-deletes the owned `ScaledObject`.
To prevent this, add the `httpscaledobject.keda.sh/orphan-scaledobject` annotation to the `HTTPScaledObject` before deleting it.
The controller removes the owner reference from the `ScaledObject`, so it survives deletion.

Set these environment variables before running the commands:

```bash
NAME=my-app
NAMESPACE=default
```

1. Annotate the `HTTPScaledObject` to orphan its `ScaledObject`:

   ```bash
   kubectl annotate httpscaledobject $NAME -n $NAMESPACE \
     httpscaledobject.keda.sh/orphan-scaledobject=true
   ```

   The controller removes the owner reference from the `ScaledObject`.
   Verify that the owner reference was removed:

   ```bash
   kubectl get scaledobject $NAME -n $NAMESPACE \
     -o jsonpath='{.metadata.ownerReferences}'
   ```

   The output is empty when the owner reference has been removed.

2. Create the `InterceptorRoute`:

   ```bash
   kubectl apply -f interceptor-route.yaml
   ```

   When the `InterceptorRoute` shares the same namespace and name as the `HTTPScaledObject`, the routing table automatically gives the `InterceptorRoute` precedence and skips the `HTTPScaledObject`.

3. Update the `ScaledObject` trigger metadata.
   The auto-created `ScaledObject` references the `HTTPScaledObject` by name in its trigger metadata.
   Replace `httpScaledObject` with `interceptorRoute` so the external scaler resolves metrics from the `InterceptorRoute`:

   ```bash
   kubectl patch scaledobject $NAME -n $NAMESPACE --type=json \
     -p '[{"op": "remove", "path": "/spec/triggers/0/metadata/httpScaledObject"},
          {"op": "add", "path": "/spec/triggers/0/metadata/interceptorRoute", "value": "'$NAME'"}]'
   ```

   Also compare the remaining fields with the ScaledObject YAML from the conversion example and adjust `minReplicaCount`, `maxReplicaCount`, or `cooldownPeriod` as needed.

4. Verify the `ScaledObject` is still present and active:

   ```bash
   kubectl get scaledobject $NAME -n $NAMESPACE
   ```

5. Delete the old `HTTPScaledObject`:

   ```bash
   kubectl delete httpscaledobject $NAME -n $NAMESPACE
   ```

   The `ScaledObject` remains in the cluster because the owner reference was removed in step 1.

> **GitOps:** In one commit, add the orphan annotation to the `HTTPScaledObject` manifest, add the `InterceptorRoute` manifest, and update the `ScaledObject` trigger metadata (`httpScaledObject` → `interceptorRoute`).
> In the next commit, remove the `HTTPScaledObject` manifest.

## Field mapping

### HTTPScaledObject → InterceptorRoute

| HTTPScaledObject field                            | InterceptorRoute field                                  |
| ------------------------------------------------- | ------------------------------------------------------- |
| `spec.hosts`                                      | `spec.rules[].hosts`                                    |
| `spec.pathPrefixes`                               | `spec.rules[].paths[].value`                            |
| `spec.headers`                                    | `spec.rules[].headers`                                  |
| `spec.scaleTargetRef.service`                     | `spec.target.service`                                   |
| `spec.scaleTargetRef.port`                        | `spec.target.port`                                      |
| `spec.scaleTargetRef.portName`                    | `spec.target.portName`                                  |
| `spec.coldStartTimeoutFailoverRef.service`        | `spec.coldStart.fallback.service`                       |
| `spec.coldStartTimeoutFailoverRef.port`           | `spec.coldStart.fallback.port`                          |
| `spec.coldStartTimeoutFailoverRef.portName`       | `spec.coldStart.fallback.portName`                      |
| `spec.coldStartTimeoutFailoverRef.timeoutSeconds` | `spec.timeouts.readiness` (as `Duration`, e.g. `"30s"`) |
| `spec.scalingMetric.concurrency.targetValue`      | `spec.scalingMetric.concurrency.targetValue`            |
| `spec.scalingMetric.requestRate.targetValue`      | `spec.scalingMetric.requestRate.targetValue`            |
| `spec.scalingMetric.requestRate.window`           | `spec.scalingMetric.requestRate.window`                 |
| `spec.scalingMetric.requestRate.granularity`      | `spec.scalingMetric.requestRate.granularity`            |
| `spec.targetPendingRequests`                      | `spec.scalingMetric`                                    |
| `spec.timeouts.conditionWait`                     | `spec.timeouts.readiness`                               |
| `spec.timeouts.responseHeader`                    | `spec.timeouts.responseHeader`                          |
| _(new)_                                           | `spec.timeouts.request`                                 |

### HTTPScaledObject → ScaledObject

| HTTPScaledObject field           | ScaledObject field               |
| -------------------------------- | -------------------------------- |
| `spec.scaleTargetRef.name`       | `spec.scaleTargetRef.name`       |
| `spec.scaleTargetRef.apiVersion` | `spec.scaleTargetRef.apiVersion` |
| `spec.scaleTargetRef.kind`       | `spec.scaleTargetRef.kind`       |
| `spec.replicas.min`              | `spec.minReplicaCount`           |
| `spec.replicas.max`              | `spec.maxReplicaCount`           |
| `spec.scaledownPeriod`           | `spec.cooldownPeriod`            |
| `spec.initialCooldownPeriod`     | `spec.initialCooldownPeriod`     |

## What's Next

- [Configure Routing Rules](../../user-guide/configure-routing/) — multiple rules, host, path, and header matching on an InterceptorRoute.
- [Configure Scaling Metrics](../../user-guide/configure-scaling/) — concurrency, request rate, and combined metric configuration.
- [InterceptorRoute Reference](../../reference/interceptorroute/) — full API specification.
- [KEDA ScaledObject documentation](https://keda.sh/docs/latest/concepts/scaling-deployments/) — scaling configuration options.
