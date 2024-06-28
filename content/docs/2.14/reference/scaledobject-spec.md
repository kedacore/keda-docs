
+++
title = "ScaledObject specification"
weight = 3000
+++

## Overview

This specification describes the `ScaledObject` Custom Resource definition that defines the triggers and scaling behaviors used by KEDA to scale `Deployment`, `StatefulSet` and `Custom Resource` target resources. The `.spec.ScaleTargetRef` section holds the reference to the target resource, defined in [_scaledobject_types.go_](https://github.com/kedacore/keda/blob/main/apis/keda/v1alpha1/scaledobject_types.go).

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: {scaled-object-name}
  annotations:
    scaledobject.keda.sh/transfer-hpa-ownership: "true"     # Optional. Use to transfer an existing HPA ownership to this ScaledObject
    validations.keda.sh/hpa-ownership: "true"               # Optional. Use to disable HPA ownership validation on this ScaledObject
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

## scaleTargetRef

```yaml
  scaleTargetRef:
    apiVersion:    {api-version-of-target-resource}  # Optional. Default: apps/v1
    kind:          {kind-of-target-resource}         # Optional. Default: Deployment
    name:          {name-of-target-resource}         # Mandatory. Must be in the same namespace as the ScaledObject
    envSourceContainerName: {container-name}         # Optional. Default: .spec.template.spec.containers[0]
```

The reference to the resource this ScaledObject is configured for. This is the resource KEDA will scale up/down and set up an HPA for, based on the triggers defined in `triggers:`.

To scale Kubernetes Deployments only `name` need be specified. To scale a different resource such as StatefulSet or Custom Resource (that defines `/scale` subresource), appropriate `apiVersion` (following standard Kubernetes convention, ie. `{api}/{version}`) and `kind` need to be specified.

`envSourceContainerName` is an optional property that specifies the name of container in the target resource, from which KEDA should try to get environment properties holding secrets etc.  If it is not defined, KEDA will try to get environment properties from the first Container, ie. from `.spec.template.spec.containers[0]`.

**Assumptions:** Resource referenced by `name` (and `apiVersion`, `kind`) is in the same namespace as the ScaledObject


## pollingInterval
```yaml
  pollingInterval: 30  # Optional. Default: 30 seconds
```

This is the interval to check each trigger on. By default, KEDA will check each trigger source on every ScaledObject every 30 seconds.

**Example:** in a queue scenario, KEDA will check the queueLength every `pollingInterval`, and scale the resource up or down accordingly.


## cooldownPeriod
```yaml
  cooldownPeriod:  300 # Optional. Default: 300 seconds
```

The period to wait after the last trigger reported active before scaling the resource back to 0, in seconds. By default, it's 300 (5 minutes).

The `cooldownPeriod` only applies after a trigger occurs; when you first create your `Deployment` (or `StatefulSet`/`CustomResource`), KEDA will immediately scale it to `minReplicaCount`.  Additionally, the KEDA `cooldownPeriod` only applies when scaling to 0; scaling from 1 to N replicas is handled by the [Kubernetes Horizontal Pod Autoscaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/../concepts/scaling-deployments.md#support-for-cooldowndelay).

**Example:** wait 5 minutes after the last time KEDA checked the queue and it was empty. (this is obviously dependent on `pollingInterval`)


## initialCooldownPeriod
```yaml
   InitialCooldownPeriod:  120 # Optional. Default: 0 seconds
```
The delay before the `cooldownPeriod` starts after the initial creation of the `ScaledObject`, in seconds. By default, it's 0, meaning the `cooldownPeriod` begins immediately upon creation. If set to a value such as 120 seconds, the `cooldownPeriod` will only start after the `ScaledObject` has been active for that duration.

This parameter is particularly useful for managing the scale-down behavior during the initial phase of a `ScaledObject`. For instance, if `InitialCooldownPeriod` is set to 120 seconds, KEDA will not scale the resource back to 0 until 120 seconds have passed since the `ScaledObject` creation, regardless of the activity triggers. This allows for a grace period in situations where immediate scaling down after creation is not desirable.

**Example:** Wait 120 seconds after the `ScaledObject` is created before starting the `cooldownPeriod`. For instance, if the `InitialCooldownPeriod` is set to 120 seconds, KEDA will not initiate the cooldown process until 120 seconds have passed since the `ScaledObject` was first created, regardless of the triggers' activity. This ensures a buffer period where the resource won’t be scaled down immediately after creation. (Note: This setting is independent of the `pollingInterval`.)


## idleReplicaCount

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


## minReplicaCount

```yaml
  minReplicaCount: 1   # Optional. Default: 0
```

Minimum number of replicas KEDA will scale the resource down to. By default, it's scale to zero, but you can use it with some other value as well.

## maxReplicaCount

```yaml
  maxReplicaCount: 100 # Optional. Default: 100
```
This setting is passed to the HPA definition that KEDA will create for a given resource and holds the maximum number of replicas of the target resource.


## fallback
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


## advanced

### restoreToOriginalReplicaCount

```yaml
advanced:
  restoreToOriginalReplicaCount: true/false        # Optional. Default: false
```

This property specifies whether the target resource (`Deployment`, `StatefulSet`,...) should be scaled back to original replicas count, after the `ScaledObject` is deleted.
Default behavior is to keep the replica count at the same number as it is in the moment of `ScaledObject's` deletion.

For example a `Deployment` with `3 replicas` is created, then `ScaledObject` is created and the `Deployment` is scaled by KEDA to `10 replicas`. Then `ScaledObject` is deleted:
 1. if `restoreToOriginalReplicaCount = false` (default behavior) then `Deployment` replicas count is `10`
 2. if `restoreToOriginalReplicaCount = true` then `Deployment` replicas count is set back to `3` (the original value)


### horizontalPodAutoscalerConfig

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

#### horizontalPodAutoscalerConfig.name

The name of the HPA resource KEDA will create. By default, it's `keda-hpa-{scaled-object-name}`

#### horizontalPodAutoscalerConfig.behavior

Starting from Kubernetes v1.18 the autoscaling API allows scaling behavior to be configured through the HPA behavior field. This way one can directly affect scaling of 1<->N replicas, which is internally being handled by HPA. KEDA would feed values from this section directly to the HPA's `behavior` field. Please follow [Kubernetes documentation](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/../concepts/scaling-deployments.md#configurable-scaling-behavior) for details.

**Assumptions:** KEDA must be running on Kubernetes cluster v1.18+, in order to be able to benefit from this setting.



```yaml
advanced:
  scalingModifiers:                                       # Optional. Section to specify scaling modifiers
    target: {target-value-to-scale-on}                        # Mandatory. New target if metrics are anyhow composed together
    activationTarget: {activation-target-value-to-scale-on}   # Optional. New activation target if metrics are anyhow composed together
    metricType:  {metric-tipe-for-the-modifier}               # Optional. Metric type to be used if metrics are anyhow composed together
    formula: {formula-for-fetched-metrics}                    # Mandatory. Formula for calculation
```

### scalingModifiers

The `scalingModifiers` is optional and **experimental**. If defined, both `target` and `formula` are mandatory. Using this structure creates `composite-metric` for the HPA that will replace all requests for external metrics and handle them internally. With `scalingModifiers` each trigger used in the `formula` **must** have a name defined.

#### scalingModifiers.target

`target` defines new target value to scale on for the composed metric.

#### scalingModifiers.activationTarget

`activationTarget` defines a new [activation target value](../concepts/scaling-deployments.md#activating-and-scaling-thresholds) to scale on for the composed metric. (Default: `0`, Optional)

#### scalingModifiers.metricType

`metricType` defines metric type used for this new `composite-metric`. (Values: `AverageValue`, `Value`, Default: `AverageValue`, Optional)

#### scalingModifiers.formula

  `formula` composes metrics together and allows them to be modified/manipulated. It accepts mathematical/conditional statements using [this external project](https://github.com/antonmedv/expr). If the `fallback` scaling feature is in effect, the `formula` will NOT modify its metrics (therefore it modifies metrics only when all of their triggers are healthy). Complete language definition of `expr` package can be found [here](https://expr.medv.io/docs/Language-Definition). Formula must return a single value (not boolean).

For examples of this feature see section [Scaling Modifiers](../concepts/scaling-deployments.md#scaling-modifiers-experimental).


## triggers

```yaml
  triggers:
  # {list of triggers to activate scaling of the target resource}
```

> 💡 **NOTE:** You can find all supported triggers [here](../scalers).

Trigger fields:
- **type**: The type of trigger to use. (Mandatory)
- **metadata**: The configuration parameters that the trigger requires. (Mandatory)
- **name**: Name for this trigger. This value can be used to easily distinguish this specific trigger and its metrics when consuming [Prometheus metrics](../operate/prometheus.md). By default, the name is generated from the trigger type. (Optional)
- **useCachedMetrics**: Enables caching of metric values during polling interval (as specified in `.spec.pollingInterval`). For more information, see ["Caching Metrics"](../concepts/scaling-deployments.md#caching-metrics). (Values: `false`, `true`, Default: `false`, Optional)
- **authenticationRef**: A reference to the `TriggerAuthentication` or `ClusterTriggerAuthentication` object that is used to authenticate the scaler with the environment.
  - More details can be found [here](../concepts/authentication). (Optional)
- **metricType**: The type of metric that should be used. (Values: `AverageValue`, `Value`, `Utilization`, Default: `AverageValue`, Optional)
  - Learn more about how the [Horizontal Pod Autoscaler (HPA) calculates `replicaCount`](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/) based on metric type and value.
  - To show the differences between the metric types, let's assume we want to scale a deployment with 3 running replicas based on a queue of messages:
    - With `AverageValue` metric type, we can control how many messages, on average, each replica will handle. If our metric is the queue size, the threshold is 5 messages, and the current message count in the queue is 20, HPA will scale the deployment to 20 / 5 = 4 replicas, regardless of the current replica count.
    - The `Value` metric type, on the other hand, can be used when we don't want to take the average of the given metric across all replicas. For example, with the `Value` type, we can control the average time of messages in the queue. If our metric is average time in the queue, the threshold is 5 milliseconds, and the current average time is 20 milliseconds, HPA will scale the deployment to 3 * 20 / 5 = 12.

> ⚠️ **NOTE:** All scalers, except CPU and Memory, support metric types `AverageValue` and `Value` while CPU and Memory scalers both support `AverageValue` and `Utilization`.
