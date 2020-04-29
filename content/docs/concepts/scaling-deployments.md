+++
title = "Scaling Deployments"
weight = 200
+++

## Overview

Deployments are the most common way to scale workloads with KEDA.

It allows you to define the Kubernetes Deployment that you want KEDA to scale based on a scale trigger. KEDA will monitor that service and based on the events that occur it will automatically scale your deployment out/in accordingly.

Behind the scenes, KEDA acts to monitor the event source and feed that data to Kubernetes and the HPA (Horizontal Pod Autoscaler) to drive rapid scale of a deployment.  Each replica of a deployment is actively pulling items from the event source.  With KEDA and scaling deployments you can scale based on events while also preserving rich connection and processing semantics with the event source (e.g. in-order processing, retries, deadletter, checkpointing).

For example, if you wanted to use KEDA with an Apache Kafka topic as event source, the flow of information would be:

* When no messages are pending processing, KEDA can scale the deployment to zero.
* When a message arrives, KEDA detects this event and activates the deployment.
* When the deployment starts running, one of the containers connects to Kafka and starts pulling messages.
* As more messages arrive on the Kafka Topic, KEDA can feed this data to the HPA to drive scale out.
* Each replica of the deployment is actively processing messages.  Very likely, each replica is processing a batch of messages in a distributed manner.

## ScaledObject spec

This specification describes the `ScaledObject` custom resource definition which is used to define how KEDA should scale your application and what the triggers are.

[`scaledobject_types.go`](https://github.com/kedacore/keda/blob/master/pkg/apis/keda/v1alpha1/scaledobject_types.go)

```yaml
apiVersion: keda.k8s.io/v1alpha1
kind: ScaledObject
metadata:
  name: {scaled-object-name}
spec:
  scaleTargetRef:
    deploymentName: {deployment-name} # must be in the same namespace as the ScaledObject
    containerName: {container-name}  #Optional. Default: deployment.spec.template.spec.containers[0]
  pollingInterval: 30  # Optional. Default: 30 seconds
  cooldownPeriod:  300 # Optional. Default: 300 seconds
  minReplicaCount: 0   # Optional. Default: 0
  maxReplicaCount: 100 # Optional. Default: 100
  triggers:
  # {list of triggers to activate the deployment}
```

You can find all supported triggers [here](/scalers).

### Details
```yaml
  scaleTargetRef:
    deploymentName: {deployment-name} # must be in the same namespace
    containerName: {container-name}  #Optional. Default: deployment.spec.template.spec.containers[0]
```

The name of the deployment this scaledObject is for. This is the deployment KEDA will scale up and setup an HPA for based on the triggers defined in `triggers:`. Make sure to include the deployment name in the label as well, otherwise the metrics provider will not be able to query the metrics for the scaled object and 1-n scale will be broken.

**Assumptions:** `deploymentName` is in the same namespace as the scaledObject

---

```yaml
  pollingInterval: 30  # Optional. Default: 30 seconds
```

This is the interval to check each trigger on. By default KEDA will check each trigger source on every ScaledObject every 30 seconds.

**Example:** in a queue scenario, KEDA will check the queueLength every `pollingInterval`, and scale the deployment up or down accordingly.

---

```yaml
  cooldownPeriod:  300 # Optional. Default: 300 seconds
```

The period to wait after the last trigger reported active before scaling the deployment back to `minReplicaCount`. By default it's 5 minutes (300 seconds).  The `cooldownPeriod` only applies after a trigger occurs; when you first create your `Deployment`, KEDA will immediately scale it to `minReplicaCount`.

**Example:** wait 5 minutes after the last time KEDA checked the queue and it was empty. (this is obviously dependent on `pollingInterval`)

```yaml
  minReplicaCount: 0   # Optional. Default: 0
```

Minimum number of replicas KEDA will scale the deployment down to. By default it's scale to zero, but you can use it with some other value as well. KEDA will not enforce that value, meaning you can manually scale the deployment to 0 and KEDA will not scale it back up. However, when KEDA itself is scaling the deployment it will respect the value set there.

---

```yaml
  maxReplicaCount: 100 # Optional. Default: 100
```

This setting is passed to the HPA definition that KEDA will create for a given deployment.

## Long-running executions

One important consideration to make is how this pattern can work with long running executions.  Imagine a deployment triggers on a RabbitMQ queue message.  Each message takes 3 hours to process.  It's possible that if many queue messages arrive, KEDA will help drive scaling out to many replicas - let's say 4.  Now the HPA makes a decision to scale down from 4 replicas to 2.  There is no way to control which of the 2 replicas get terminated to scale down.  That means the HPA may attempt to terminate a replica that is 2.9 hours into processing a 3 hour queue message.

There are two main ways to handle this scenario.

### Leverage the container lifecycle

Kubernetes provides a few [lifecycle hooks](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/) that can be leveraged to delay termination.  Imagine a replica is scheduled for termination and is 2.9 hours into processing a 3 hour message.  Kubernetes will send a [`SIGTERM`](https://www.gnu.org/software/libc/manual/html_node/Termination-Signals.html) to signal the intent to terminate.  Rather than immediately terminating, a deployment can delay termination until processing the current batch of messages has completed.  Kubernetes will wait for a `SIGTERM` response or the `terminationGracePeriodSeconds` before killing the replica.

> NOTE: There are other ways to delay termination, including the [`preStop` Hook](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/#container-hooks)

Using this method can preserve a replica and enable long-running executions.  However, one downside of this approach is while delaying termination, the pod phase will remain in the `Terminating` state.  That means a pod that is delaying termination for a very long duration may show `Terminating` during that entire period of delay.

### Run as jobs

The other alternative to handling long running executions is by running the event driven code in Kubernetes Jobs instead of Deployments.  This approach is discussed [in the next section](../scaling-jobs).
