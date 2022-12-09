+++
title = "Kubernetes Workload"
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
    value: '1'
```

**Parameter list:**

- `podSelector` - [Label selector](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#label-selectors) that will be used to get the pod count. It supports multiple selectors split by a comma character (`,`). It also supports [set-based requirements](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#set-based-requirement) and a mix of them.
- `value` - Target relation between the scaled workload and the amount of pods which matches the selector. It will be calculated following this formula: `relation = (pods which match selector) / (scaled workload pods)`.

> 💡 **Note:** The search scope is limited to the namespace where the `ScaledObject` is deployed.

### Authentication Parameters

The own KEDA's identity is used to list the pods, so no extra configuration is needed here.

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
      value: '3'
```
