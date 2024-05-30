+++
title = "Scaling Deployments, StatefulSets & Custom Resources"
weight = 200
+++

This page describes the deployment scaling behavior of KEDA. See the [Scaled Object specification](../reference/scaledobject-spec.md) for details on how to set the behaviors described below.

# Scaling objects

## Scaling Deployments and StatefulSets

Deployments and StatefulSets are the most common way to scale workloads with KEDA.

It allows you to define the Kubernetes Deployment or StatefulSet that you want KEDA to scale based on a scale trigger. KEDA will monitor that service and based on the events that occur it will automatically scale your resource out/in accordingly.

Behind the scenes, KEDA acts to monitor the event source and feed that data to Kubernetes and the HPA (Horizontal Pod Autoscaler) to drive rapid scale of a resource.  Each replica of a resource is actively pulling items from the event source.  With KEDA and scaling Deployments/StatefulSet you can scale based on events while also preserving rich connection and processing semantics with the event source (e.g. in-order processing, retries, deadletter, checkpointing).

For example, if you wanted to use KEDA with an Apache Kafka topic as event source, the flow of information would be:

* When no messages are pending processing, KEDA can scale the deployment to zero.
* When a message arrives, KEDA detects this event and activates the deployment.
* When the deployment starts running, one of the containers connects to Kafka and starts pulling messages.
* As more messages arrive at the Kafka Topic, KEDA can feed this data to the HPA to drive scale out.
* Each replica of the deployment is actively processing messages.  Very likely, each replica is processing a batch of messages in a distributed manner.

## Scaling Custom Resources

With KEDA you can scale any workload defined as any `Custom Resource` (for example `ArgoRollout` [resource](https://argoproj.github.io/argo-rollouts/)). The scaling behaves the same way as scaling for arbitrary Kubernetes `Deployment` or `StatefulSet`.

The only constraint is that the target `Custom Resource` must define `/scale` [subresource](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/#scale-subresource).

# Features

## Caching Metrics

This feature enables caching of metric values during polling interval (as specified in `.spec.pollingInterval`). Kubernetes (HPA controller) asks for a metric every few seconds (as defined by `--horizontal-pod-autoscaler-sync-period`, usually 15s), then this request is routed to KEDA Metrics Server, that by default queries the scaler and reads the metric values. Enabling this feature changes this behavior such that KEDA Metrics Server tries to read metric from the cache first. This cache is updated periodically during the polling interval.

Enabling this feature can significantly reduce the load on the scaler service.

This feature is not supported for `cpu`, `memory` or `cron` scaler.

## Pausing autoscaling

It can be useful to instruct KEDA to pause the autoscaling of objects, to do to cluster maintenance or to avoid resource starvation by removing non-mission-critical workloads.

This is preferable to deleting the resource because it removes the instances it is running from operation without touching the applications themselves. When ready, you can then reenable scaling.

You can pause autoscaling by adding this annotation to your `ScaledObject` definition:


```yaml
metadata:
  annotations:
    autoscaling.keda.sh/paused-replicas: "0"
    autoscaling.keda.sh/paused: "true"
```

The presence of these annotations will pause autoscaling no matter what number of replicas is provided.

The annotation `autoscaling.keda.sh/paused` will pause scaling immediately and use the current instance count while the annotation `autoscaling.keda.sh/paused-replicas: "<number>"` will scale your current workload to specified amount of replicas and pause autoscaling. You can set the value of replicas for an object to be paused to any arbitrary number.

Typically, either one or the other is being used given they serve a different purpose/scenario. However, if both `paused` and `paused-replicas` are set, KEDA will scale your current workload to the number specified count in `paused-replicas` and then pause autoscaling.

To unpause (reenable) autoscaling again, remove all paused annotations from the `ScaledObject` definition. If you paused with `autoscaling.keda.sh/paused`, you can unpause by setting the annotation to `false`.


## Scaling Modifiers (Experimental)

**Example: compose average value**

```yaml
advanced:
  scalingModifiers:
    formula: "(trig_one + trig_two)/2"
    target: "2"
    activationTarget: "2"
    metricType: "AverageValue"
...
triggers:
  - type: kubernetes-workload
    name: trig_one
    metadata:
      podSelector: 'pod=workload-test'
  - type: metrics-api
    name: trig_two
    metadata:
      url: "https://mockbin.org/bin/336a8d99-9e09-4f1f-979d-851a6d1b1423"
      valueLocation: "tasks"
```

Formula composes 2 given metrics from 2 triggers `kubernetes-workload` named `trig_one` and `metrics-api` named `trig_two` together as an average value and returns one final metric which is used to make autoscaling decisions on.

**Example: activationTarget**

```yaml
advanced:
  scalingModifiers:
    activationTarget: "2"
```

If the calculated value is <=2, the ScaledObject is not `Active` and it'll scale to 0 if it's allowed.

**Example: ternary operator**

```yaml
advanced:
  scalingModifiers:
    formula: "trig_one > 2 ? trig_one + trig_two : 1"
```

If metric value of trigger `trig_one` is more than 2, then return `trig_one` + `trig_two` otherwise return 1.

**Example: count function**

```yaml
advanced:
  scalingModifiers:
    formula: "count([trig_one,trig_two,trig_three],{#>1}) > 1 ? 5 : 0"
```

If at least 2 metrics (from the list `trig_one`,`trig_two`,`trig_three`) have value of more than 1, then return 5, otherwise return 0

**Example: nested conditions and operators**

```yaml
advanced:
  scalingModifiers:
    formula: "trig_one < 2 ? trig_one+trig_two >= 2 ? 5 : 10 : 0"
```

Conditions can be used within another condition as well.
If value of `trig_one` is less than 2 AND `trig_one`+`trig_two` is atleast 2 then return 5, if only the first is true return 10, if the first condition is false then return 0.

Complete language definition of `expr` package can be found [here](https://expr.medv.io/docs/Language-Definition). Formula must return a single value (not boolean). All formulas are internally wrapped with float cast.

## Activating and Scaling thresholds

KEDA has 2 different phases during the autoscaling process.

- **Activation phase:** The activating (or deactivating) phase is the moment when KEDA (operator) has to decide if the workload should be scaled from/to zero. KEDA takes responsibility for this action based on the result of the scaler `IsActive` function and only applies to 0<->1 scaling. There are use-cases where the activating value (0-1 and 1-0) is totally different than 0, such as workloads scaled with the Prometheus scaler where the values go from -X to X.
- **Scaling phase:** The scaling phase is the moment when KEDA has decided to scale out to 1 instance and now it is the HPA controller who takes the scaling decisions based on the configuration defined in the generated HPA (from ScaledObject data) and the metrics exposed by KEDA (metrics server). This phase applies the to 1<->N scaling.

KEDA allows you to specify different values for each scenario:

- **Activation:** Defines when the scaler is active or not and scales from/to 0 based on it.
- **Scaling:** Defines the target value to scale the workload from 1 to _n_ instances and vice versa. To achieve this, KEDA passes the target value to the Horizontal Pod Autoscaler (HPA) and the built-in HPA controller will handle all the autoscaling.

> ⚠️ **NOTE:** If the minimum replicas is >= 1, the scaler is always active and the activation value will be ignored.

Each scaler defines parameters for their use-cases, but the activation will always be the same as the scaling value, appended by the prefix `activation` (ie: `threshold` for scaling and `activationThreshold` for activation).

There are some important topics to take into account:

- Opposite to scaling value, the activation value is always optional and the default value is 0.
- Activation only occurs when this value is greater than the set value; not greater than or equal to.
  - ie, in the default case: `activationThreshold: 0` will only activate when the metric value is 1 or more
- The activation value has more priority than the scaling value in case of different decisions for each. ie: `threshold: 10` and `activationThreshold: 50`, in case of 40 messages the scaler is not active and it'll be scaled to zero even the HPA requires 4 instances.

> ⚠️ **NOTE:** If a scaler doesn't define "activation" parameter (a property that starts with `activation` prefix), then this specific scaler doesn't support configurable activation value and the activation value is always 0.

## Transferring ownership of an existing HPA

If your environment already operates using kubernetes HPA, you can transfer the ownership of this resource to a new ScaledObject:

```yaml
metadata:
  annotations:
    scaledobject.keda.sh/transfer-hpa-ownership: "true"
spec:
   advanced:
      horizontalPodAutoscalerConfig:
        name: {name-of-hpa-resource}
```

> ⚠️ **NOTE:** You need to specify a custom HPA name in your ScaledObject matching the existing HPA name you want it to manage.

## Disabling validations on an existing HPA

You are allowed to disable admission webhooks validations with the following snippet. It grants you better flexibility but also brings vulnerabilities. Do it **at your own risk**.

```yaml
metadata:
  annotations:
    validations.keda.sh/hpa-ownership: "true"
```

### Long-running executions

One important consideration to make is how this pattern can work with long-running executions.  Imagine a deployment triggers on a RabbitMQ queue message.  Each message takes 3 hours to process.  It's possible that if many queue messages arrive, KEDA will help drive scaling out to many replicas - let's say 4.  Now the HPA makes a decision to scale down from 4 replicas to 2.  There is no way to control which of the 2 replicas get terminated to scale down.  That means the HPA may attempt to terminate a replica that is 2.9 hours into processing a 3 hour queue message.

There are two main ways to handle this scenario.

#### Leverage the container lifecycle

Kubernetes provides a few [lifecycle hooks](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/) that can be leveraged to delay termination.  Imagine a replica is scheduled for termination and is 2.9 hours into processing a 3 hour message.  Kubernetes will send a [`SIGTERM`](https://www.gnu.org/software/libc/manual/html_node/Termination-Signals.html) to signal the intent to terminate.  Rather than immediately terminating, a deployment can delay termination until processing the current batch of messages has completed.  Kubernetes will wait for a `SIGTERM` response or the `terminationGracePeriodSeconds` before killing the replica.

> 💡 **NOTE:** There are other ways to delay termination, including the [`preStop` Hook](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/#container-hooks).

Using this method can preserve a replica and enable long-running executions.  However, one downside of this approach is while delaying termination, the pod phase will remain in the `Terminating` state.  That means a pod that is delaying termination for a very long duration may show `Terminating` during that entire period of delay.

#### Run as jobs

The other alternative to handling long-running executions is by running the event driven code in Kubernetes Jobs instead of Deployments or Custom Resources.  This approach is discussed [in the next section](./scaling-jobs).
