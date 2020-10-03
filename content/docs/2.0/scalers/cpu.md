+++
title = "CPU"
layout = "scaler"
availability = "v2.0+"
maintainer = "Community"
description = "Scale applications based on cpu metrics."
go_file = "cpu_memory_scaler"
+++

### Trigger Specification

This specification describes the `cpu` trigger that scales based on cpu metrics.

```yaml
triggers:
- type: cpu
  metadata:
    # Required
    type: value/ utilization/ averagevalue
    value: 60
```

**Parameter list:**

- `type ` represents whether the metric type is Utilization, Value, or AverageValue. Required.
- `value ` this value depends on the type setting
	- if `type` set to `Value` this value is target value of the metric (as a quantity)
	- if `type` set to `Utilization ` this value  is the target value of the average of the resource metric across all relevant pods, represented as a percentage of the requested value of the resource for the pods. Currently only valid for Resource.
	- if `type` set to `AverageValue` this value  is the target value of the average of the metric across all relevant pods (quantity). Required.

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
      type: "50"
```
