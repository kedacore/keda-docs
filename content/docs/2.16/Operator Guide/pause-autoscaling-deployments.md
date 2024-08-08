+++
title = "Pause Auto-Scaling with deployments"
weight = 600
+++

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
