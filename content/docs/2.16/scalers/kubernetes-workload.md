+++
title = "Kubernetes Workload"
availability = "v2.4+"
maintainer = "Community"
category = "Apps"
description = "Scale applications based on the count of running pods that match the given selectors."
go_file = "kubernetes_workload_scaler"
+++

### Trigger Specification

```yaml
triggers:
- type: kubernetes-workload
  metadata:
    podSelector: 'app=backend'
    value: '0.5'
    activationValue: '3.1'
```

**Parameter list:**

- `podSelector` - [Label selector](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#label-selectors) that will be used to get the pod count. It supports multiple selectors split by a comma character (`,`). It also supports [set-based requirements](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#set-based-requirement) and a mix of them.
- `value` - Target relation between the scaled workload and the amount of pods which matches the selector. It will be calculated following this formula: `relation = (pods which match selector) / (scaled workload pods)`. (This value can be a float)
- `activationValue` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional, This value can be a float)

> 💡 **Note:** The search scope is limited to the namespace where the `ScaledObject` is deployed.

The count excludes terminated pods, i.e. [pod status](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#podstatus-v1-core) `phase` equals `Succeeded` or `Failed`.

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
