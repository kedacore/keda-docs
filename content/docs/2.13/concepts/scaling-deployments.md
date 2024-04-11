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
* As more messages arrive at the Kafka Topic, KEDA can feed this data to the HPA to drive scale out.
* Each replica of the deployment is actively processing messages.  Very likely, each replica is processing a batch of messages in a distributed manner.

### Scaling of Custom Resources

With KEDA you can scale any workload defined as any `Custom Resource` (for example `ArgoRollout` [resource](https://argoproj.github.io/argo-rollouts/)). The scaling behaves the same way as scaling for arbitrary Kubernetes `Deployment` or `StatefulSet`.

The only constraint is that the target `Custom Resource` must define `/scale` [subresource](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/#scale-subresource).

## ScaledObject spec

This specification describes the `ScaledObject` Custom Resource definition which is used to define how KEDA should scale your application and what the triggers are. The `.spec.ScaleTargetRef` section holds the reference to the target resource, ie. `Deployment`, `StatefulSet` or `Custom Resource`.

[`scaledobject_types.go`](https://github.com/kedacore/keda/blob/main/apis/keda/v1alpha1/scaledobject_types.go)

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: {scaled-object-name}
  annotations:
    scaledobject.keda.sh/transfer-hpa-ownership: "true"      # Optional. Use to transfer an existing HPA ownership to this ScaledObject
    autoscaling.keda.sh/paused-replicas: "0"                # Optional. Use to pause autoscaling of objects
    autoscaling.keda.sh/paused: "true"                      # Optional. Use to pause autoscaling of objects explicitly
spec:
  scaleTargetRef:
    apiVersion:    {api-version-of-target-resource}         # Optional. Default: apps/v1
    kind:          {kind-of-target-resource}                # Optional. Default: Deployment
    name:          {name-of-target-resource}                # Mandatory. Must be in the same namespace as the ScaledObject
    envSourceContainerName: {container-name}                # Optional. Default: .spec.template.spec.containers[0]
  pollingInterval:  30                                      # Optional. Default: 30 seconds
  cooldownPeriod:   300                                     # Optional. Default: 300 seconds
  idleReplicaCount: 0                                       # Optional. Default: ignored, must be less than minReplicaCount
  minReplicaCount:  1                                       # Optional. Default: 0
  maxReplicaCount:  100                                     # Optional. Default: 100
  fallback:                                                 # Optional. Section to specify fallback options
    failureThreshold: 3                                     # Mandatory if fallback section is included
    replicas: 6                                             # Mandatory if fallback section is included
  advanced:                                                 # Optional. Section to specify advanced options
    restoreToOriginalReplicaCount: true/false               # Optional. Default: false
    horizontalPodAutoscalerConfig:                          # Optional. Section to specify HPA related options
      name: {name-of-hpa-resource}                          # Optional. Default: keda-hpa-{scaled-object-name}
      behavior:                                             # Optional. Use to modify HPA's scaling behavior
        scaleDown:
          stabilizationWindowSeconds: 300
          policies:
          - type: Percent
            value: 100
            periodSeconds: 15
  triggers:
  # {list of triggers to activate scaling of the target resource}
```

### Details
```yaml
  scaleTargetRef:
    apiVersion:    {api-version-of-target-resource}  # Optional. Default: apps/v1
    kind:          {kind-of-target-resource}         # Optional. Default: Deployment
    name:          {name-of-target-resource}         # Mandatory. Must be in the same namespace as the ScaledObject
    envSourceContainerName: {container-name}         # Optional. Default: .spec.template.spec.containers[0]
```

The reference to the resource this ScaledObject is configured for. This is the resource KEDA will scale up/down and setup an HPA for, based on the triggers defined in `triggers:`.

To scale Kubernetes Deployments only `name` is needed to be specified, if one wants to scale a different resource such as StatefulSet or  Custom Resource (that defines `/scale` subresource), appropriate `apiVersion` (following standard Kubernetes convention, ie. `{api}/{version}`) and `kind` need to be specified.

`envSourceContainerName` is an optional property that specifies the name of container in the target resource, from which KEDA should try to get environment properties holding secrets etc.  If it is not defined, KEDA will try to get environment properties from the first Container, ie. from `.spec.template.spec.containers[0]`.

**Assumptions:** Resource referenced by `name` (and `apiVersion`, `kind`) is in the same namespace as the ScaledObject

---
#### pollingInterval
```yaml
  pollingInterval: 30  # Optional. Default: 30 seconds
```

This is the interval to check each trigger on. By default, KEDA will check each trigger source on every ScaledObject every 30 seconds.

**Example:** in a queue scenario, KEDA will check the queueLength every `pollingInterval`, and scale the resource up or down accordingly.

---
#### cooldownPeriod
```yaml
  cooldownPeriod:  300 # Optional. Default: 300 seconds
```

The period to wait after the last trigger reported active before scaling the resource back to 0. By default, it's 5 minutes (300 seconds).

The `cooldownPeriod` only applies after a trigger occurs; when you first create your `Deployment` (or `StatefulSet`/`CustomResource`), KEDA will immediately scale it to `minReplicaCount`.  Additionally, the KEDA `cooldownPeriod` only applies when scaling to 0; scaling from 1 to N replicas is handled by the [Kubernetes Horizontal Pod Autoscaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#support-for-cooldowndelay).

**Example:** wait 5 minutes after the last time KEDA checked the queue and it was empty. (this is obviously dependent on `pollingInterval`)

---
#### idleReplicaCount

```yaml
  idleReplicaCount: 0   # Optional. Default: ignored, must be less than minReplicaCount
```

> 💡 **NOTE:** Due to limitations in HPA controller the only supported value for this property is 0, it will not work correctly otherwise. See this [issue](https://github.com/kedacore/keda/issues/2314) for more details.
>
> In some cases, you always need at least `n` pod running. Thus, you can omit this property and set `minReplicaCount` to `n`.
>
> **Example** You set `minReplicaCount` to 1 and `maxReplicaCount` to 10. If there’s no activity on triggers, the target resource is scaled down to `minReplicaCount` (1). Once there are activities, the target resource will scale base on the HPA rule. If there’s no activity on triggers, the resource is again scaled down to `minReplicaCount` (1).

If this property is set, KEDA will scale the resource down to this number of replicas. If there's some activity on target triggers KEDA will scale the target resource immediately to `minReplicaCount` and then will be scaling handled by HPA. When there is no activity, the target resource is again scaled down to `idleReplicaCount`. This setting must be less than `minReplicaCount`.

**Example:** If there's no activity on triggers the target resource is scaled down to `idleReplicaCount` (0), once there is an activity the target resource is immediately scaled to `minReplicaCount` (10) and then up to `maxReplicaCount` (100) as needed. If there's no activity on triggers the resource is again scaled down to `idleReplicaCount` (0).

---
#### minReplicaCount
```yaml
  minReplicaCount: 1   # Optional. Default: 0
```

Minimum number of replicas KEDA will scale the resource down to. By default, it's scale to zero, but you can use it with some other value as well.

---
#### maxReplicaCount
```yaml
  maxReplicaCount: 100 # Optional. Default: 100
```

This setting is passed to the HPA definition that KEDA will create for a given resource and holds the maximum number of replicas of the target resource.

---
#### fallback
```yaml
  fallback:                                          # Optional. Section to specify fallback options
    failureThreshold: 3                              # Mandatory if fallback section is included
    replicas: 6                                      # Mandatory if fallback section is included
```

The `fallback` section is optional. It defines a number of replicas to fall back to if a scaler is in an error state.

KEDA will keep track of the number of consecutive times each scaler has failed to get metrics from its source. Once that value passes the `failureThreshold`, instead of not propagating a metric to the HPA (the default error behaviour), the scaler will, instead, return a normalised metric using the formula:
```
target metric value * fallback replicas
```
Due to the HPA metric being of type `AverageValue` (see below), this will have the effect of the HPA scaling the deployment to the defined number of fallback replicas.

**Example:** When my instance of prometheus is unavailable 3 consecutive times, KEDA will change the HPA metric such that the deployment will scale to 6 replicas.

There are a few limitations to using a fallback:
 - It only supports scalers whose target is an `AverageValue` metric. Thus, it is **not** supported by the CPU & memory scalers, or by scalers whose metric target type is `Value`. In these cases, it will assume that fallback is disabled.
 - It is only supported by `ScaledObjects` **not** `ScaledJobs`.

---
#### advanced
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
    name: {name-of-hpa-resource}                   # Optional. Default: keda-hpa-{scaled-object-name}
    behavior:                                      # Optional. Use to modify HPA's scaling behavior
      scaleDown:
        stabilizationWindowSeconds: 300
        policies:
        - type: Percent
          value: 100
          periodSeconds: 15
```

##### `horizontalPodAutoscalerConfig:`

###### `horizontalPodAutoscalerConfig.name`

The name of the HPA resource KEDA will create. By default, it's `keda-hpa-{scaled-object-name}`

###### `horizontalPodAutoscalerConfig.behavior`

Starting from Kubernetes v1.18 the autoscaling API allows scaling behavior to be configured through the HPA behavior field. This way one can directly affect scaling of 1<->N replicas, which is internally being handled by HPA. KEDA would feed values from this section directly to the HPA's `behavior` field. Please follow [Kubernetes documentation](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#configurable-scaling-behavior) for details.

**Assumptions:** KEDA must be running on Kubernetes cluster v1.18+, in order to be able to benefit from this setting.

---

```yaml
advanced:
  scalingModifiers:                                       # Optional. Section to specify scaling modifiers
    target: {target-value-to-scale-on}                        # Mandatory. New target if metrics are anyhow composed together
    activationTarget: {activation-target-value-to-scale-on}   # Optional. New activation target if metrics are anyhow composed together
    metricType:  {metric-tipe-for-the-modifier}               # Optional. Metric type to be used if metrics are anyhow composed together
    formula: {formula-for-fetched-metrics}                    # Mandatory. Formula for calculation
```

##### `scalingModifiers`

The `scalingModifiers` is optional and **experimental**. If defined, both `target` and `formula` are mandatory. Using this structure creates `composite-metric` for the HPA that will replace all requests for external metrics and handle them internally. With `scalingModifiers` each trigger used in the `formula` **must** have a name defined.

###### `scalingModifiers.target`

`target` defines new target value to scale on for the composed metric.

###### `scalingModifiers.activationTarget`

`activationTarget` defines new [activation target value](./scaling-deployments.md#activating-and-scaling-thresholds) to scale on for the composed metric. (Default: `0`, Optional)

###### `scalingModifiers.metricType`

`metricType` defines metric type used for this new `composite-metric`. (Values: `AverageValue`, `Value`, Default: `AverageValue`, Optional)

###### `scalingModifiers.formula`

  `formula` composes metrics together and allows them to be modified/manipulated. It accepts mathematical/conditional statements using [this external project](https://github.com/antonmedv/expr). If the `fallback` scaling feature is in effect, the `formula` will NOT modify its metrics (therefore it modifies metrics only when all of their triggers are healthy). Complete language definition of `expr` package can be found [here](https://expr.medv.io/docs/Language-Definition). Formula must return a single value (not boolean).

For examples of this feature see section [Scaling Modifiers](#scaling-modifiers-experimental) below.

---
#### triggers
```yaml
  triggers:
  # {list of triggers to activate scaling of the target resource}
```

> 💡 **NOTE:** You can find all supported triggers [here](/scalers).

Trigger fields:
- **type**: The type of trigger to use. (Mandatory)
- **metadata**: The configuration parameters that the trigger requires. (Mandatory)
- **name**: Name for this trigger. This value can be used to easily distinguish this specific trigger and its metrics when consuming [Prometheus metrics](../operate/prometheus.md). By default, the name is generated from the trigger type. (Optional)
- **useCachedMetrics**: Enables caching of metric values during polling interval (as specified in `.spec.pollingInterval`). For more information, see ["Caching Metrics"](#caching-metrics). (Values: `false`, `true`, Default: `false`, Optional)
- **authenticationRef**: A reference to the `TriggerAuthentication` or `ClusterTriggerAuthentication` object that is used to authenticate the scaler with the environment.
  - More details can be found [here](./authentication). (Optional)
- **metricType**: The type of metric that should be used. (Values: `AverageValue`, `Value`, `Utilization`, Default: `AverageValue`, Optional)
  - Learn more about how the [Horizontal Pod Autoscaler (HPA) calculates `replicaCount`](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/) based on metric type and value.
  - To show the differences between the metric types, let's assume we want to scale a deployment with 3 running replicas based on a queue of messages:
    - With `AverageValue` metric type, we can control how many messages, on average, each replica will handle. If our metric is the queue size, the threshold is 5 messages, and the current message count in the queue is 20, HPA will scale the deployment to 20 / 5 = 4 replicas, regardless of the current replica count.
    - The `Value` metric type, on the other hand, can be used when we don't want to take the average of the given metric across all replicas. For example, with the `Value` type, we can control the average time of messages in the queue. If our metric is average time in the queue, the threshold is 5 milliseconds, and the current average time is 20 milliseconds, HPA will scale the deployment to 3 * 20 / 5 = 12.

> ⚠️ **NOTE:** All scalers, except CPU and Memory, support metric types `AverageValue` and `Value` while CPU and Memory scalers both support `AverageValue` and `Utilization`.

### Caching Metrics

This feature enables caching of metric values during polling interval (as specified in `.spec.pollingInterval`). Kubernetes (HPA controller) asks for a metric every few seconds (as defined by `--horizontal-pod-autoscaler-sync-period`, usually 15s), then is this request routed to KEDA Metrics Server, that by default queries the scaler and reads the metric values. Enabling this feature changes this behavior, KEDA Metrics Server tries to read metric from the cache first. This cache is being updated periodically during the polling interval.

Enabling this feature can significantly reduce the load on the scaler service.

This feature is not supported for `cpu`, `memory` or `cron` scaler.

### Pause autoscaling

It can be useful to instruct KEDA to pause autoscaling of objects, if you want to do to cluster maintenance or you want to avoid resource starvation by removing non-mission-critical workloads. You can enable this by adding the below annotation to your `ScaledObject` definition:

```yaml
metadata:
  annotations:
    autoscaling.keda.sh/paused-replicas: "0"
    autoscaling.keda.sh/paused: "true"
```

The presence of these annotations will pause autoscaling no matter what number of replicas is provided.

The annotation `autoscaling.keda.sh/paused` will pause scaling immediately and use the current instance count while the annotation `autoscaling.keda.sh/paused-replicas: "<number>"` will scale your current workload to specified amount of replicas and pause autoscaling. You can set the value of replicas for an object to be paused to any arbitrary number.

Typically, either one or the other is being used given they serve a different purpose/scenario. However, if both `paused` and `paused-replicas` are set, KEDA will scale your current workload to the number specified count in `paused-replicas` and then pause autoscaling.

To enable/unpause autoscaling again, simply remove all paused annotations from the `ScaledObject` definition. If you paused with `autoscaling.keda.sh/paused`, you can also set the annotation to `false` to unpause.


### Scaling Modifiers (Experimental)

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

If atleast 2 metrics (from the list `trig_one`,`trig_two`,`trig_three`) have value of more than 1, then return 5, otherwise return 0

**Example: nested conditions and operators**

```yaml
advanced:
  scalingModifiers:
    formula: "trig_one < 2 ? trig_one+trig_two >= 2 ? 5 : 10 : 0"
```

Conditions can be used within another condition as well.
If value of `trig_one` is less than 2 AND `trig_one`+`trig_two` is atleast 2 then return 5, if only the first is true return 10, if the first condition is false then return 0.

Complete language definition of `expr` package can be found [here](https://expr.medv.io/docs/Language-Definition). Formula must return a single value (not boolean). All formulas are internally wrapped with float cast.
### Activating and Scaling thresholds

To give a consistent solution to this problem, KEDA has 2 different phases during the autoscaling process.

- **Activation phase:** The activating (or deactivating) phase is the moment when KEDA (operator) has to decide if the workload should be scaled from/to zero. KEDA takes responsibility for this action based on the result of the scaler `IsActive` function and only applies to 0<->1 scaling. There are use-cases where the activating value (0-1 and 1-0) is totally different than 0, such as workloads scaled with the Prometheus scaler where the values go from -X to X.
- **Scaling phase:** The scaling phase is the moment when KEDA has decided to scale out to 1 instance and now it is the HPA controller who takes the scaling decisions based on the configuration defined in the generated HPA (from ScaledObject data) and the metrics exposed by KEDA (metrics server). This phase applies the to 1<->N scaling.

#### Managing Activation & Scaling Thresholds

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

## Transfer ownership of an existing HPA

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


## Long-running executions

One important consideration to make is how this pattern can work with long-running executions.  Imagine a deployment triggers on a RabbitMQ queue message.  Each message takes 3 hours to process.  It's possible that if many queue messages arrive, KEDA will help drive scaling out to many replicas - let's say 4.  Now the HPA makes a decision to scale down from 4 replicas to 2.  There is no way to control which of the 2 replicas get terminated to scale down.  That means the HPA may attempt to terminate a replica that is 2.9 hours into processing a 3 hour queue message.

There are two main ways to handle this scenario.

### Leverage the container lifecycle

Kubernetes provides a few [lifecycle hooks](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/) that can be leveraged to delay termination.  Imagine a replica is scheduled for termination and is 2.9 hours into processing a 3 hour message.  Kubernetes will send a [`SIGTERM`](https://www.gnu.org/software/libc/manual/html_node/Termination-Signals.html) to signal the intent to terminate.  Rather than immediately terminating, a deployment can delay termination until processing the current batch of messages has completed.  Kubernetes will wait for a `SIGTERM` response or the `terminationGracePeriodSeconds` before killing the replica.

> 💡 **NOTE:** There are other ways to delay termination, including the [`preStop` Hook](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/#container-hooks).

Using this method can preserve a replica and enable long-running executions.  However, one downside of this approach is while delaying termination, the pod phase will remain in the `Terminating` state.  That means a pod that is delaying termination for a very long duration may show `Terminating` during that entire period of delay.

### Run as jobs

The other alternative to handling long-running executions is by running the event driven code in Kubernetes Jobs instead of Deployments or Custom Resources.  This approach is discussed [in the next section](../scaling-jobs).
