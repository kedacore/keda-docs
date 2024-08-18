+++
title = "Pause Auto-Scaling jobs"
weight = 600
+++

## Pausing autoscaling

It can be useful to instruct KEDA to pause the autoscaling of objects, to do to cluster maintenance or to avoid resource starvation by removing non-mission-critical workloads.

This is preferable to deleting the resource because it removes the instances it is running from operation without touching the applications themselves. When ready, you can then reenable scaling.

You can pause autoscaling by adding this annotation to your `ScaledJob` definition:

```yaml
metadata:
  annotations:
    autoscaling.keda.sh/paused: true
```

To reenable autoscaling, remove the annotation from the `ScaledJob` definition or set the value to `false`.

```yaml
metadata:
  annotations:
    autoscaling.keda.sh/paused: false
```
