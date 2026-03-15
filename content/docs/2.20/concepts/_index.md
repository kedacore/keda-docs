+++
title = "KEDA Concepts"
description = "What KEDA is and how it works"
weight = 1
+++

## What is KEDA?

**KEDA** is a tool that helps [Kubernetes](https://kubernetes.io) scale applications based on real-world events. It was created by Microsoft and Red Hat. With KEDA, you can adjust the size of your containers automatically, depending on the workload—like the number of messages in a queue or incoming requests.

It’s lightweight and works alongside Kubernetes components like the Horizontal Pod Autoscaler (HPA). It doesn’t replace anything but adds more functionality. You can choose which apps to scale with KEDA while leaving others untouched. This makes it flexible and easy to integrate with your existing setup.

## How KEDA works

KEDA monitors external event sources, like message queues, databases, or APIs, and automatically adjusts the number of running pods based on real-time demand. When events arrive, KEDA scales your workload up to handle the load. When things go quiet, it scales back down, all the way to zero if needed.

It does this by working alongside Kubernetes' existing Horizontal Pod Autoscaler rather than replacing it. KEDA feeds the HPA with external metrics, extending it beyond CPU and memory to any event source you can connect to. The result is an application that responds to actual workload rather than just infrastructure signals.

For batch workloads, KEDA takes a different approach: instead of scaling a running deployment up or down, it creates new Kubernetes Jobs in response to events, for example, one job per message in a queue.

## KEDA Architecture

The diagram below shows how KEDA works in conjunction with the Kubernetes Horizontal Pod Autoscaler, external event sources, and Kubernetes' [etcd](https://etcd.io) data store:

![KEDA architecture](/img/keda-arch-new.png)

KEDA runs three components inside the Kubernetes cluster, each with a distinct responsibility:

* **keda-operator** watches your ScaledObjects and manages the full HPA lifecycle. It is also directly responsible for scaling a workload between zero and one replica—bringing an idle deployment back to life when events arrive, or scaling it down to zero when there is nothing to process.
* **keda-metrics-apiserver** exposes the external metrics (polled from event sources such as Kafka, RabbitMQ, Elasticsearch, or SQS) to the Kubernetes HPA via the Kubernetes API Server. The HPA queries these metrics to decide how many replicas are needed above one.
* **keda-admission-webhooks** validate every ScaledObject at the moment it is applied, catching configuration mistakes, such as two ScaledObjects targeting the same deployment, before they cause problems at runtime.

The scaling flow works in two complementary tracks:

1. **Zero-to-one and one-to-zero scaling** is handled directly by the keda-operator. When an event source becomes active, the operator brings the deployment up from zero replicas; when it goes idle again, the operator scales it back down to zero.
2. **One-to-N and N-to-one scaling** is delegated to the Horizontal Pod Autoscaler. The keda-operator creates and manages the HPA resource; the HPA queries external metrics through the Kubernetes API Server (served by the keda-metrics-apiserver), and adjusts the number of running pods accordingly.

The ReplicaSet inside the Deployment translates the desired replica count set by both tracks into actual running pods.

## KEDA Custom Resources (CRDs)

KEDA uses **Custom Resource Definitions (CRDs)** to manage scaling behavior:

* **ScaledObject**: Links your app (like a **Deployment** or **StatefulSet**) to an external event source, defining how scaling works.
* **ScaledJob**: Handles batch processing tasks by scaling Jobs based on external metrics.
* **TriggerAuthentication**: Provides secure ways to access event sources, supporting methods like environment variables or cloud-specific credentials.

These CRDs give you control over scaling while keeping your apps secure and responsive to demand.

## Scaling Deployments, StatefulSets, and Custom Resources

KEDA goes beyond CPU or memory-based scaling by connecting to external data sources like message queues, databases, or APIs. This means your apps scale in real-time based on actual workload needs.

### Scaling Deployments and StatefulSets

With KEDA, you can scale Deployments and StatefulSets easily. By creating a ScaledObject, you link your workload to an event source, like a queue or request rate. KEDA adjusts the number of instances based on demand.

Deployments are perfect for stateless apps that need quick scaling. StatefulSets are great for apps requiring stable storage or identity, like databases. KEDA ensures your resources are used efficiently while keeping up with demand.

> Note: When using CPU or Memory triggers, the metric flow is different. KEDA still creates and manages the HPA, but the HPA fetches CPU and Memory data directly from the Kubernetes `metrics-server`, not via the `keda-metrics-apiserver`. As a result, scale-to-zero is not supported with CPU or Memory triggers: without running pods, there are no metrics to observe, so KEDA has no signal to scale back up from zero.

### Scaling Custom Resources

KEDA also supports custom Kubernetes resources. You set up a ScaledObject tailored to your resource and connect it to an event trigger, like database changes. From there, you define the scaling limits, and KEDA handles the rest, ensuring your custom app scales dynamically.

### Scaling Jobs

KEDA can scale Kubernetes Jobs for batch processing. By creating a ScaledJob, you link the task to an external event, like queue size. KEDA adjusts the number of job instances in real-time, cleaning up completed jobs automatically. This ensures you only use resources when needed.

### Authentication

KEDA supports secure connections to external event sources using TriggerAuthentication. You can configure it to work with secrets, cloud-native authentication like AWS IAM role, or Azure Active Directory. This keeps your connections secure and your data safe.

### External Scalers

KEDA connects to various services, like message queues or cloud APIs, through scalers. These fetch real-time metrics to determine when and how to scale. KEDA includes built-in scalers for popular services, but you can create custom ones if needed. This lets your workloads respond to real-world demand effortlessly.

### Consuming Raw Scaler Metrics Externally

KEDA also allows consuming the internal metrics (coming from internal or external scalers) to interested 3rd parties. This feature is exposed using gRPC server stream API and needs to be first enabled by setting `RAW_METRICS_GRPC_PROTOCOL` to "`enabled`". Then one can subscribe to a metric identified by ScaledObject/ScaledJob name, namespace and trigger name using any gRPC client (example with [grpcurl](https://github.com/kedacore/keda/pull/7093#issuecomment-3333530716)).

You can control when raw metrics are sent using the `RAW_METRICS_MODE` environment variable:

* `all` or `""` (empty): Sends all raw metrics, both when the metrics server requests them (HPA) and during the regular polling interval of each ScaledObject or ScaledJob. This is the default behavior.
* `hpa`: Sends raw metrics only when the Kubernetes metrics server explicitly requests metrics for a ScaledObject. This means metrics are sent in response to HPA queries, not on a regular schedule.
* `pollinginterval`: Sends raw metrics only during the polling interval of each ScaledObject or ScaledJob. In this mode, metrics are pushed out at each polling cycle, regardless of HPA requests.
* Any unknown value will default to the `all` mode.
