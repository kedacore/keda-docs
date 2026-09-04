+++
title = "Autoscaling WebAssembly on Kubernetes with KEDA and wasmCloud"
date = 2026-06-30
author = "Eric Gregory (Cosmonic)"
+++

If you run KEDA, you can now autoscale [wasmCloud](https://wasmcloud.com/)'s WebAssembly workloads with your existing scaler. The CNCF wasmCloud project is a cloud native platform for running WebAssembly workloads across any cloud, Kubernetes, datacenter, or edge, and the v2.4.0 release brings standard Kubernetes autoscaling for WebAssembly workloads, meaning that KEDA can now drive Wasm deployments in the same way as any ordinary K8s `Deployment`.

So what does this mean for KEDA users?

- **No new scaler required.** wasmCloud's `WorkloadDeployment` implements the standard `/scale` subresource, so you can point `scaleTargetRef` at your Wasm deployment like any other resource.
- **Scaling at high density.** Wasm components (which typically have very small footprints in the kilobytes to low megabytes) are scaled within high-density host pods. Autoscaling changes the number of component instances on top of host pods that mostly stay put.
- **Works with any trigger that reads external or object metrics.** Prometheus, Kafka, NATS, OTel: the usual catalog applies. (Pod- and resource-typed metrics don't, because wasmCloud components aren't pods.)

## Why run WebAssembly on Kubernetes?

WebAssembly (Wasm) components are tiny, sandboxed, and start in microseconds. Where a container carries an operating system and ambient permissions, a Wasm component is a single artifact running in a memory-safe, deny-by-default sandbox: it sees only the capabilities explicitly granted to it. That makes Wasm a natural fit for ultra-dense function workloads (many components per host pod), for sandboxing AI-generated code and Model Context Protocol (MCP) tools, and for portable edge-to-cloud deployments where the same component runs unchanged.

The [wasmCloud Kubernetes operator](https://wasmcloud.com/docs/kubernetes-operator) makes all of this Kubernetes-native: it schedules Wasm workloads onto wasmCloud hosts using custom resources, routes traffic through ordinary Kubernetes Services, and lets teams adopt WebAssembly progressively alongside their existing cluster tooling.

## The autoscaling problem

On Kubernetes, the wasmCloud operator runs your component as a `WorkloadDeployment` custom resource. Each wasmCloud host is a single pod that can run many component instances — exactly what gives the platform its density advantage.

That density is also why naïve pod-level autoscaling is the wrong primitive. Scaling the host *pods* up and down defeats the model; what you want to vary is the number of *component instances* serving a workload, on top of host pods that mostly stay put. The Horizontal Pod Autoscaler, on its own, only knows how to scale pods.

There's also a precondition worth naming up front: hosts are a separate pool managed by the operator's host group `Deployment`. Scaling a `WorkloadDeployment` schedules more component instances onto existing hosts, up to each host's configured pool size. If the host group can fit thirty instances and `maxReplicas` is one hundred, the autoscaler holds at thirty. Size the host group ahead of expected demand, or autoscale the host group separately.

## The fix: a `/scale` subresource the operator owns

The v2.4.0 release of wasmCloud adds a `/scale` subresource to the `WorkloadDeployment` CRD. Any tool that speaks the standard Kubernetes scale interface (including the HPA and, therefore, KEDA) can now drive the replica count of a Wasm workload directly, while the host pods stay where they are. `kubectl scale workloaddeployment <name> --replicas=N` just works.

The subresource is wired through three JSONPaths the HPA contract requires:

- `spec.replicas` (now defaulting to `1`, matching `Deployment` semantics) backs `specReplicasPath`.
- A new flat `status.currentReplicas` field backs `statusReplicasPath`, giving the HPA a scalar replica count to read.
- A new `status.selector` field backs `labelSelectorPath`. The HPA refuses to scale without a non-empty selector, so the operator defines a managed label — `runtime.wasmcloud.dev/workload-deployment=<name>` — stamps it onto the workload's `WorkloadReplicaSet`s, and populates the selector on every reconcile. Scaling never stalls on a missing selector mid-rollout.

The point worth underlining for KEDA users: **this did not require a new scaler**. KEDA already knows how to drive any custom resource that exposes `/scale`; the integration is just `scaleTargetRef` pointing at a `WorkloadDeployment`. The example below uses KEDA's existing [Prometheus scaler](https://keda.sh/docs/latest/scalers/prometheus/) to read request metrics the wasmCloud component exports through OpenTelemetry.

## Putting it together

With the wasmCloud operator, Prometheus, and KEDA installed, autoscaling a Wasm workload is a single `ScaledObject` targeting the `WorkloadDeployment`:

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
  maxReplicaCount: 100
  pollingInterval: 15
  cooldownPeriod: 60
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://prometheus.monitoring.svc.cluster.local:9090
        query: sum(rate(http_server_requests_total{workload="hello-world"}[1m]))
        threshold: "10"
```

The component doesn't need to be aware of KEDA. It emits standard OpenTelemetry metrics, Prometheus (or another OTel-aware collector) scrapes them, and KEDA closes the loop through the same `/scale` subresource a stock HPA would use.

In this demo, wasmCloud maintainer Jeremy Fleitz drives roughly 450 requests per second at a single Hello World workload and watches KEDA scale it from one to thirty-eight component instances across three host pods, with a target of ten requests per instance. Traffic subsides and the workload scales back down, but the number of host pods doesn't change.

{{< youtube JZpeuglct6c >}}

`WorkloadDeployment` autoscaling isn't always the right tool; for steady or predictably bursty traffic on a static host group, a higher per-component `poolSize` is often the cheaper answer. The [Autoscaling page in the wasmCloud operator manual](https://wasmcloud.com/docs/kubernetes-operator/operator-manual/autoscaling/) provides more information on host group sizing, status fields, when *not* to reach for autoscaling, and the imperative-scaling and plain-HPA paths.

## Try it yourself

If you're already running Kubernetes and curious about WebAssembly, it's easy to give it a whirl: install the operator, deploy a component, put a `ScaledObject` in front of it.

- Deploy the [wasmCloud operator](https://wasmcloud.com/docs/kubernetes-operator) on your cluster.
- Read the [wasmCloud Custom Resource Definitions](https://wasmcloud.com/docs/kubernetes-operator/crds) reference.
- Follow the [KEDA + wasmCloud integration guide](https://keda.sh/docs/latest/integrations/wasmcloud/).

The `/scale` subresource shipped in [wasmCloud 2.4.0](https://wasmcloud.com/blog/wasmcloud-2-4-0-release); thanks to Cosmonic's Jeremy Fleitz for driving the contribution upstream.

If you have questions about wasmCloud or would like to chat with users and maintainers, come say hello in the [wasmCloud Slack](https://slack.wasmcloud.com/)!
