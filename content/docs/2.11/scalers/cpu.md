+++
title = "CPU"
availability = "v2.0+"
maintainer = "Community"
description = "Scale applications based on cpu metrics."
go_file = "cpu_memory_scaler"
+++

> **Notice:**
> - This scaler **requires prerequisites**. See the 'Prerequisites' section.
> - This scaler can scale to 0 only when user defines at least one additional scaler which is not CPU or Memory (eg. Kafka + CPU, or Prometheus + CPU) and `minReplicaCount` is 0.
> - This scaler only applies to ScaledObject, not to Scaling Jobs.

### Prerequisites

KEDA uses standard `cpu` and `memory` metrics from the Kubernetes Metrics Server, which is not installed by default on certain Kubernetes deployments such as EKS on AWS. Additionally, the `resources` section of the relevant Kubernetes Pods must include `requests` (at a minimum).

- The Kubernetes Metrics Server must be installed. Installation instructions vary based on your Kubernetes provider.
- The configuration for your Kubernetes Pods must include a `resources` section with specified `requests`. See [Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/). If the resources section is empty (`resources: {}` or similar) the error `missing request for {cpu/memory}` occurs.

```yaml
# a working example of resources with specified requests
spec:
  containers:
  - name: app
    image: images.my-company.example/app:v4
    resources:
      requests:
        memory: "128Mi"
        cpu: "500m"
```

### Trigger Specification

This specification describes the `cpu` trigger that scales based on cpu metrics.

```yaml
triggers:
- type: cpu
  metricType: Utilization # Allowed types are 'Utilization' or 'AverageValue'
  metadata:
    type: Utilization # Deprecated in favor of trigger.metricType; allowed types are 'Utilization' or 'AverageValue'
    value: "60"
    containerName: "" # Optional. You can use this to target a specific container in a pod
```

**Parameter list:**

- `type` - Type of metric to use. Options are `Utilization`, or `AverageValue`.
- `value` - Value to trigger scaling actions for:
	- When using `Utilization`, the target value is the average of the resource metric across all relevant pods, represented as a percentage of the requested value of the resource for the pods.
	- When using `AverageValue`, the target value is the target value of the average of the metric across all relevant pods (quantity).
- `containerName` - Name of the specific container to scale based on its CPU, rather than the entire pod. Defaults to empty if not specified.

> 💡 **NOTE:** `containerName` parameter requires Kubernetes cluster version 1.20 or higher with `HPAContainerMetrics` feature enabled. Please see [container resource metrics](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#container-resource-metrics) for more information.

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
    metricType: Utilization # Allowed types are 'Utilization' or 'AverageValue'
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
    metricType: Utilization # Allowed types are 'Utilization' or 'AverageValue'
    metadata:
      value: "50"
      containerName: "foo"
```
