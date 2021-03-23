+++
title = "Scaling Deployments, StatefulSets & Custom Resources"
weight = 200
+++

## Overview

### Scaling of Deployments and StatefulSets

Deployments and StatefulSets are the most common way to scale workloads with KEDA.

It allows you to define the Kubernetes Deployment or StatefulSet that you want KEDA to scale based on a scale trigger. KEDA will monitor that service and based on the events that occur it will automatically scale your resource out/in accordingly.

Behind the scenes, KEDA acts to monitor the event source and feed that data to Kubernetes and the HPA (Horizontal Pod Autoscaler) to drive rapid scale of a resource.  Each replica of a resource is actively pulling items from the event source.  With KEDA and scaling Deployments/StatefulSet you can scale based on events while also preserving rich connection and processing semantics with the event source (e.g. in-order processing, retries, deadletter, checkpointing).

For example, if you wanted to use KEDA with an Apache Kafka topic as event source, the flow of information would be:

* When no messages are pending processing, KEDA can scale the deployment to zero.
* When a message arrives, KEDA detects this event and activates the deployment.
* When the deployment starts running, one of the containers connects to Kafka and starts pulling messages.
* As more messages arrive on the Kafka Topic, KEDA can feed this data to the HPA to drive scale out.
* Each replica of the deployment is actively processing messages.  Very likely, each replica is processing a batch of messages in a distributed manner.

### Scaling of Custom Resources

With KEDA you can scale any workload defined as any `Custom Resource` (for example `ArgoRollout` [resource](https://argoproj.github.io/argo-rollouts/)). The scaling behaves the same way as scaling for arbitrary Kubernetes `Deployment` or `StatefulSet`.

The only constraint is that the target `Custom Resource` must define `/scale` [subresource](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/#scale-subresource).

## ScaledObject spec

This specification describes the `ScaledObject` Custom Resource definition which is used to define how KEDA should scale your application and what the triggers are. The `.spec.ScaleTargetRef` section holds the reference to the target resource, ie. `Deployment`, `StatefulSet` or `Custom Resource`. 

[`scaledobject_types.go`](https://github.com/kedacore/keda/blob/v2.0.0/api/v1alpha1/scaledobject_types.go)

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: {scaled-object-name}
spec:
  scaleTargetRef:
    apiVersion:    {api-version-of-target-resource}  # Optional. Default: apps/v1
    kind:          {kind-of-target-resource}         # Optional. Default: Deployment
    name:          {name-of-target-resource}         # Mandatory. Must be in the same namespace as the ScaledObject
    envSourceContainerName: {container-name}         # Optional. Default: .spec.template.spec.containers[0]
  pollingInterval: 30                                # Optional. Default: 30 seconds
  cooldownPeriod:  300                               # Optional. Default: 300 seconds
  minReplicaCount: 0                                 # Optional. Default: 0
  maxReplicaCount: 100                               # Optional. Default: 100
  advanced:                                          # Optional. Section to specify advanced options
    restoreToOriginalReplicaCount: true/false        # Optional. Default: false
    horizontalPodAutoscalerConfig:                   # Optional. Section to specify HPA related options
      behavior:                                      # Optional. Use to modify HPA's scaling behavior
        scaleDown:
          stabilizationWindowSeconds: 300
          policies:
          - type: Percent
            value: 100
            periodSeconds: 15
  triggers:
  # {list of triggers to activate scaling of the target resource}
```

> 💡 **NOTE:** You can find all supported triggers [here](/scalers).

### Details
```yaml
  scaleTargetRef:
    apiVersion:    {api-version-of-target-resource}  # Optional. Default: apps/v1
    kind:          {kind-of-target-resource}         # Optional. Default: Deployment
    name:          {name-of-target-resource}         # Mandatory. Must be in the same namespace as the ScaledObject
    envSourceContainerName: {container-name}         # Optional. Default: .spec.template.spec.containers[0]
```

The reference to the resource this ScaledObject is configured for. This is the resource KEDA will scale up/down and setup an HPA for, based on the triggers defined in `triggers:`.

To scale Kubernetes Deployments only `name` is needed to be specified, if one wants to scale a different resource such as StatefulSet or  Custom Resource (that defines `/scale` subresource), appropriate `apiVersion` (following standard Kubernetes convetion, ie. `{api}/{version}`) and `kind` need to be specified.

`envSourceContainerName` is an optional property that specifies the name of container in the target resource, from which KEDA should try to get environment properties holding secrets etc.  If it is not defined it, KEDA will try to get environment properties from the first Container, ie. from `.spec.template.spec.containers[0]`.

**Assumptions:** Resource referenced by `name` (and `apiVersion`, `kind`) is in the same namespace as the ScaledObject

---

```yaml
  pollingInterval: 30  # Optional. Default: 30 seconds
```

This is the interval to check each trigger on. By default KEDA will check each trigger source on every ScaledObject every 30 seconds.

**Example:** in a queue scenario, KEDA will check the queueLength every `pollingInterval`, and scale the resource up or down accordingly.

---

```yaml
  cooldownPeriod:  300 # Optional. Default: 300 seconds
```

The period to wait after the last trigger reported active before scaling the resource back to 0. By default it's 5 minutes (300 seconds).

The `cooldownPeriod` only applies after a trigger occurs; when you first create your `Deployment` (or `StatefulSet`/`CustomResource`), KEDA will immediately scale it to `minReplicaCount`.  Additionally, the KEDA `cooldownPeriod` only applies when scaling to 0; scaling from 1 to N replicas is handled by the [Kubernetes Horizontal Pod Autoscaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#support-for-cooldowndelay).

**Example:** wait 5 minutes after the last time KEDA checked the queue and it was empty. (this is obviously dependent on `pollingInterval`)

---

```yaml
  minReplicaCount: 0   # Optional. Default: 0
```

Minimum number of replicas KEDA will scale the resource down to. By default it's scale to zero, but you can use it with some other value as well. KEDA will not enforce that value, meaning you can manually scale the resource to 0 and KEDA will not scale it back up. However, when KEDA itself is scaling the resource it will respect the value set there.

---

```yaml
  maxReplicaCount: 100 # Optional. Default: 100
```

This setting is passed to the HPA definition that KEDA will create for a given resource.

---

```yaml
advanced:
  restoreToOriginalReplicaCount: true/false        # Optional. Default: false
```

This property specifies whether the target resource (`Deployment`, `StatefulSet`,...) should be scaled back to original replicas count, after the `ScaledObject` is deleted. 
Default behavior is to keep the replica count at the same number as it is in the moment of `ScaledObject's` deletion.

For example a `Deployment` with `3 replicas` is created, then `ScaledObject` is created and the `Deployment` is scaled by KEDA to `10 replicas`. Then `ScaledObject` is deleted:
 1. if `restoreToOriginalReplicaCount = false` (default behavior) then `Deployment` replicas count is `10`
 2. if `restoreToOriginalReplicaCount = true` then `Deployment` replicas count is set back to `3` (the original value)

---

```yaml
advanced:
  horizontalPodAutoscalerConfig:                   # Optional. Section to specify HPA related options
    behavior:                                      # Optional. Use to modify HPA's scaling behavior
      scaleDown:
        stabilizationWindowSeconds: 300
        policies:
        - type: Percent
          value: 100
          periodSeconds: 15
```

**`horizontalPodAutoscalerConfig:`**

**`horizontalPodAutoscalerConfig.behavior`:**

Starting from Kubernetes v1.18 the autoscaling API allows scaling behavior to be configured through the HPA behavior field. This way one can directly affect scaling of 1<->N replicas, which is internally being handled by HPA. KEDA would feed values from this section directly to the HPA's `behavior` field. Please follow [Kubernetes documentation](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#support-for-configurable-scaling-behavior) for details.

**Assumptions:** KEDA must be running on Kubernetes cluster v1.18+, in order to be able to benefit from this setting.

## Long-running executions

One important consideration to make is how this pattern can work with long running executions.  Imagine a deployment triggers on a RabbitMQ queue message.  Each message takes 3 hours to process.  It's possible that if many queue messages arrive, KEDA will help drive scaling out to many replicas - let's say 4.  Now the HPA makes a decision to scale down from 4 replicas to 2.  There is no way to control which of the 2 replicas get terminated to scale down.  That means the HPA may attempt to terminate a replica that is 2.9 hours into processing a 3 hour queue message.

There are two main ways to handle this scenario.

### Leverage the container lifecycle

Kubernetes provides a few [lifecycle hooks](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/) that can be leveraged to delay termination.  Imagine a replica is scheduled for termination and is 2.9 hours into processing a 3 hour message.  Kubernetes will send a [`SIGTERM`](https://www.gnu.org/software/libc/manual/html_node/Termination-Signals.html) to signal the intent to terminate.  Rather than immediately terminating, a deployment can delay termination until processing the current batch of messages has completed.  Kubernetes will wait for a `SIGTERM` response or the `terminationGracePeriodSeconds` before killing the replica.

> 💡 **NOTE:**There are other ways to delay termination, including the [`preStop` Hook](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/#container-hooks)

Using this method can preserve a replica and enable long-running executions.  However, one downside of this approach is while delaying termination, the pod phase will remain in the `Terminating` state.  That means a pod that is delaying termination for a very long duration may show `Terminating` during that entire period of delay.

### Run as jobs

The other alternative to handling long running executions is by running the event driven code in Kubernetes Jobs instead of Deployments or Custom Resources.  This approach is discussed [in the next section](../scaling-jobs).
