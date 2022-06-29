+++
title = "CPU"
layout = "scaler"
availability = "v2.0+"
maintainer = "Community"
description = "Scale applications based on cpu metrics."
go_file = "cpu_memory_scaler"
+++

> **Notice:** 
> - This scaler will never scale to 0 and even when user define multiple scaler types (eg. Kafka + cpu/memory, or Prometheus + cpu/memory), the deployment will never scale to 0
> - This scaler only applies to ScaledObject, not to Scaling Jobs.

### Trigger Specification

This specification describes the `cpu` trigger that scales based on cpu metrics.

```yaml
triggers:
- type: cpu
  metadata:
    # Required
    type: Utilization # or AverageValue
    value: "60"
```

**Parameter list:**

- `type` - Type of metric to use. Options are `Utilization`, or `AverageValue`.
- `value` - Value to trigger scaling actions for:
	- When using `Utilization`, the target value is the average of the resource metric across all relevant pods, represented as a percentage of the requested value of the resource for the pods.
	- When using `AverageValue`, the target value is the target value of the average of the metric across all relevant pods (quantity).

### Example

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
    metadata:
      type: Utilization
      value: "50"
```
