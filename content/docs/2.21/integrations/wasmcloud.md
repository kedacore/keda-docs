+++
title = "Autoscaling wasmCloud workloads"
description = "Autoscale WebAssembly workloads on Kubernetes by driving the wasmCloud WorkloadDeployment CRD with KEDA"
availability = "v2.0+"
project = "wasmCloud"
maintainer = "Cosmonic"
+++

## Overview

[wasmCloud](https://wasmcloud.com/) is a CNCF project for running WebAssembly (Wasm) components across clouds, Kubernetes, and edge environments. Its [Kubernetes operator](https://wasmcloud.com/docs/kubernetes-operator) schedules Wasm workloads onto wasmCloud hosts using a native Custom Resource Definition, the [`WorkloadDeployment`](https://wasmcloud.com/docs/kubernetes-operator/crds).

Because each wasmCloud host packs many components into a single pod, scaling host pods is the wrong approach: this would undermine the workload density that makes Wasm attractive in the first place. Instead, one should scale the number of *component instances* serving a workload. To make that possible, the `WorkloadDeployment` CRD exposes a `/scale` subresource, which means KEDA (and the underlying Horizontal Pod Autoscaler) can drive it exactly as it would a `Deployment`, without scaling the host pods themselves.

This integration was contributed to wasmCloud by [Cosmonic](https://cosmonic.com/). A full walkthrough is demonstrated in this video:

{{< youtube JZpeuglct6c >}}

> No new scaler is required. KEDA's existing [Prometheus scaler](../../scalers/prometheus) supplies the metric, and the `scaleTargetRef` points at the `WorkloadDeployment` custom resource.

## How it works

1. The wasmCloud operator runs your Wasm workload as a `WorkloadDeployment`, with HTTP traffic routed to the host pods through a standard Kubernetes `Service` and its `EndpointSlices`.
2. wasmCloud reports per-invocation metrics through OpenTelemetry, which are scraped by Prometheus.
3. KEDA reads a Prometheus metric (for example, in-flight or per-second requests) and updates the `WorkloadDeployment`'s `/scale` subresource.
4. The operator reconciles the requested replica count, spreading component instances across the available hosts.

## Under the hood: the `/scale` subresource

The Horizontal Pod Autoscaler can scale any resource that exposes a `/scale` subresource, and KEDA builds directly on the HPA. The wasmCloud operator implements that subresource on the `WorkloadDeployment` CRD with the three JSONPaths the HPA contract requires:

```yaml
subresources:
  scale:
    specReplicasPath: .spec.replicas
    statusReplicasPath: .status.currentReplicas
    labelSelectorPath: .status.selector
```

Two flat status fields back those paths:

- `status.currentReplicas` (`int32`) — the running instance count the HPA reads through `statusReplicasPath`. It mirrors `.status.replicas.current` as a flat scalar (summed across the deployment's `WorkloadReplicaSet`s), which is what the scale contract expects.
- `status.selector` (`string`) — the serialized label selector the HPA reads through `labelSelectorPath`. The HPA requires a non-empty selector to compute metrics; without one, scaling never activates (`selector is required`).

To make that selector truthful, the operator defines a managed label, `runtime.wasmcloud.dev/workload-deployment=<name>`, and stamps it onto the `WorkloadReplicaSet`s each deployment owns. The controller populates `currentReplicas` and `selector` on **every** reconcile, including before the workload is available, so the HPA never observes a missing selector mid-deploy.

Finally, `spec.replicas` defaults to `1`, matching native `Deployment` semantics. Without a default, the HPA's `GET /scale` would error on a missing `specReplicasPath`, and a workload with `replicas` omitted could otherwise scale to zero.

Because the subresource is wired correctly, you can also scale a workload imperatively, exactly as you would a `Deployment`:

```shell
kubectl scale workloaddeployment hello-world --replicas=5
```

This work was contributed upstream to CNCF wasmCloud by Cosmonic in [wasmCloud/wasmCloud#5244](https://github.com/wasmCloud/wasmCloud/pull/5244).

## Prerequisites

- A Kubernetes cluster (a local [kind](https://wasmcloud.com/docs/kubernetes-operator) cluster works well for testing).
- The [wasmCloud operator](https://wasmcloud.com/docs/kubernetes-operator) installed via Helm.
- [Prometheus](../../integrations/prometheus) collecting metrics from your workloads.
- [KEDA installed](../../deploy) in the cluster.

## Deploy a wasmCloud workload

Deploy a component and the `Service` that exposes it. The operator manages an `EndpointSlice` for the `Service` so cluster DNS resolves to whichever host pods are running the workload:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: hello-world
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: 80
      protocol: TCP
---
apiVersion: runtime.wasmcloud.dev/v1alpha1
kind: WorkloadDeployment
metadata:
  name: hello-world
spec:
  replicas: 1
  template:
    spec:
      hostSelector:
        hostgroup: default
      kubernetes:
        service:
          name: hello-world
      components:
        - name: hello-world
          image: ghcr.io/wasmcloud/components/hello-world:0.1.0
      hostInterfaces:
        - namespace: wasi
          package: http
          interfaces:
            - incoming-handler
```

Make sure your wasmCloud hosts are configured to report metrics (enabling meters so each HTTP invocation is exported to your OpenTelemetry collector). See the [operator manual](https://wasmcloud.com/docs/kubernetes-operator/operator-manual/overview) for the relevant Helm values.

## Autoscale with a ScaledObject

Create a `ScaledObject` whose `scaleTargetRef` points at the `WorkloadDeployment` rather than a `Deployment`. KEDA can scale any custom resource that defines the `/scale` subresource as long as the `apiVersion` and `kind` are specified:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: hello-world
spec:
  scaleTargetRef:
    apiVersion: runtime.wasmcloud.dev/v1alpha1
    kind: WorkloadDeployment
    name: hello-world
  minReplicaCount: 1
  maxReplicaCount: 1000
  pollingInterval: 5
  cooldownPeriod: 30
  advanced:
    horizontalPodAutoscalerConfig:
      behavior:
        scaleDown:
          stabilizationWindowSeconds: 10
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://prometheus-server.monitoring.svc.cluster.local
        # Target ~10 requests/sec per component instance.
        query: sum(rate(http_server_requests_total{workload="hello-world"}[1m]))
        threshold: "10"
```

> The `query` and metric names depend on how your OpenTelemetry meters and Prometheus are configured; adjust them to match the metrics your workload exports. Metrics like `http_server_requests_total` come from your component's own OpenTelemetry instrumentation, not from a built-in wasmCloud host metric (those live under the `wasmcloud_host.*` namespace), so the exact names are whatever your component emits. In production you would typically scale on ingress back-pressure (such as request latency) rather than a flat request count.

Because wasmCloud workloads run on wasmCloud hosts rather than as individual Pods, Pod and Resource metrics don't apply — scale on external or object metrics such as a request rate. KEDA's Prometheus trigger (shown above) is the most direct option. If you prefer a plain HPA, the same target works with an `External` metric; unlike the KEDA Prometheus trigger, however, a bare HPA needs an external metrics provider (such as the [Prometheus Adapter](https://github.com/kubernetes-sigs/prometheus-adapter)) to serve the metric through the External Metrics API:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: hello-world
spec:
  scaleTargetRef:
    apiVersion: runtime.wasmcloud.dev/v1alpha1
    kind: WorkloadDeployment
    name: hello-world
  minReplicas: 1
  maxReplicas: 100
  metrics:
    - type: External
      external:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "10"
```

With this in place, a workload that starts as a single instance handling all incoming traffic will scale up to spread that load across many component instances (and scale back down as load subsides) while the number of host pods stays fixed.

## Further reading

- [wasmCloud Kubernetes operator](https://wasmcloud.com/docs/kubernetes-operator)
- [wasmCloud Custom Resource Definitions](https://wasmcloud.com/docs/kubernetes-operator/crds)
- [KEDA Prometheus scaler](../../scalers/prometheus)
- [Scaling custom resources with `scaleTargetRef`](../../reference/scaledobject-spec/#scaletargetref)