+++
title = "KEDA Concepts"
description = "What KEDA is and how it works"
weight = 1
+++

## What is KEDA?

KEDA is a [Kubernetes](https://kubernetes.io)-based Event Driven Autoscaler.  With KEDA, you can drive the scaling of any container in Kubernetes based on the number of events needing to be processed.  KEDA is a single-purpose and lightweight component that can be added into any Kubernetes cluster.  KEDA works alongside standard Kubernetes components like the [Horizontal Pod Autoscaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/) and can extend functionality without overwriting or duplication.  With KEDA you can explicitly map the apps you want to use event-driven scale, with other apps continuing to function.  This makes KEDA a flexible and safe option to run alongside any number of any other Kubernetes applications or frameworks.

## How KEDA works

KEDA performs two key roles within Kubernetes:

1. **Agent** — KEDA activates and deactivates Kubernetes [Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment) to scale to and from zero on no events. This is one of the primary roles of the `keda-operator` container that runs when you install KEDA.
1. **Metrics** — KEDA acts as a [Kubernetes metrics server](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#support-for-custom-metrics) that exposes rich event data like queue length or stream lag to the Horizontal Pod Autoscaler to drive scale out.  It is up to the Deployment to consume the events directly from the source.  This preserves rich event integration and enables gestures like completing or abandoning queue messages to work out of the box.  The metric serving is the primary role of the `keda-operator-metrics-apiserver` container that runs when you install KEDA.

## Architecture

The diagram below shows how KEDA works in conjunction with the Kubernetes Horizontal Pod Autoscaler, external event sources, and Kubernetes' [etcd](https://etcd.io) data store:

![KEDA architecture](/img/keda-arch.png)

### Event sources and scalers

KEDA has a wide range of [**scalers**](/scalers) that can both detect if a deployment should be activated or deactivated, and feed custom metrics for a specific event source. The following scalers are available:

{{< scalers-compact >}}

### Custom Resources (CRD)

When you install KEDA, it creates two custom resources:

1. `scaledobjects.keda.k8s.io`
1. `triggerauthentications.keda.k8s.io`

These custom resources enable you to map an event source (and the authentication to that event source) to a deployment or job for scaling.  The `ScaledObjects` represent the desired mapping between an event source (e.g. Rabbit MQ) and the Kubernetes deployment.  A `ScaledObject` may also reference a `TriggerAuthentication` which contains the authentication configuration or secrets to monitor the event source.

## Deploy KEDA

See the [Deployment](../deploy) documentation for instructions on how to deploy KEDA into any cluster using tools like [Helm](../deploy/#helm).
