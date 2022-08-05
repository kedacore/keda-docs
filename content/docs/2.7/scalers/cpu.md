+++
title = "CPU"
layout = "scaler"
availability = "v2.0+"
maintainer = "Community"
description = "Scale applications based on cpu metrics."
go_file = "cpu_memory_scaler"
+++

> **Notice:** 
> - This scaler will never scale to 0 and even when user defines multiple scaler types (eg. Kafka + cpu/memory, or Prometheus + cpu/memory), the deployment will never scale to 0.
> - This scaler only applies to ScaledObject, not to Scaling Jobs.

### Trigger Specification

This specification describes the `cpu` trigger that scales based on cpu metrics.

```yaml
triggers:
- type: cpu
  metricType: Utilization/ AverageValue
  metadata:
    type: Utilization/ AverageValue # Deprecated in favor of trigger.metricType
    value: "60"
    containerName: "" # Optional. You can use this to target a specific container in a pod
```

**Parameter list:**

- `type` - Type of metric to use. Options are `Utilization`, or `AverageValue`.
- `value` - Value to trigger scaling actions for:
	- When using `Utilization`, the target value is the average of the resource metric across all relevant pods, represented as a percentage of the requested value of the resource for the pods.
	- When using `AverageValue`, the target value is the target value of the average of the metric across all relevant pods (quantity).
- `containerName` - Set this to target the specific container rather than the entire pod. Defaults to empty if not specified.

> 💡 **NOTE:** The `type` parameter is deprecated in favor of the global `metricType` and will be removed in a future release. Users are advised to use `metricType` instead.

### Example

The following example targets CPU utilization of entire pod. If the pod has multiple containers, it will be sum of all the containers in it.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: cpu-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: my-deployment
  triggers:
  - type: cpu
    metricType: Utilization
    metadata:
      value: "50"
```

The following example targets CPU utilization of a specific container (`foo`) in a pod.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: cpu-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: my-deployment
  triggers:
  - type: cpu
    metricType: Utilization
    metadata:
      value: "50"
    containerName: "foo"
```
