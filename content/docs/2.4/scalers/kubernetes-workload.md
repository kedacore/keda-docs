+++
title = "Kubernetes Workload"
layout = "scaler"
availability = "v2.4+"
maintainer = "Community"
description = "Scale applications based on the amount of pods which matches the given selectors."
go_file = "kubernetes_workload_scaler"
+++

### Trigger Specification

```yaml
triggers:
- type: kubernetes-workload
  metadata:
    podSelector: 'app=backend'
    namespace: 'default'
    value: '1'
```

**Parameter list:**

- `podSelector` - [Label selector](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#label-selectors) that will be used to get the pod count. It supports multiple selectors split by coma (`,`). It also supports [set-based requirements](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#set-based-requirement) and a mix of them.
- `namespace` - Namespace where the `podSelector` must be applied. If it's empty, all namespaces are eligibles. This parameter is optional and default value is empty.
- `value` - Target relation between the scaled workload and the amount of pods which matches the selector. It will be calculated following this formula: `relation = (pods witch match selector) / (scaled workload pods)`

### Example

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: workload-scaledobject
spec:
  scaleTargetRef:
    name: workload-deployment
  triggers:
  - type: kubernetes-workload
    metadata:
      podSelector: 'app=backend, deploy notin (critical, monolith)'
      namespace: 'cool-namespace'
      value: '3'`
```
