+++
title = "Kubernetes Workload"
availability = "v2.4+"
maintainer = "Community"
category = "Apps"
description = "Scale applications based on the count of matching non-terminated pods, optionally grouped by node."
go_file = "kubernetes_workload_scaler"
+++

### Trigger Specification

```yaml
triggers:
- type: kubernetes-workload
  metadata:
    podSelector: 'app=backend'
    value: '0.5'
    groupByNode: 'true'
    activationValue: '3.1'
```

**Parameter list:**

- `podSelector` - [Label selector](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#label-selectors) used to match pods for this scaler. It supports multiple selectors split by a comma character (`,`). It also supports [set-based requirements](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#set-based-requirement) and a mix of them.
- `value` - Target relation between the scaled workload and the count computed by this scaler. By default, the count is the number of matching non-terminated pods. If `groupByNode` is set to `true`, the count is the number of unique nodes hosting matching non-terminated pods. Matching pods without a node assignment are excluded. It will be calculated following this formula: `relation = (scaler-computed count) / (scaled workload pods)`. (This value can be a float)
- `groupByNode` - When set to `true`, matching non-terminated pods are grouped by `spec.nodeName`, so multiple matching pods on the same node count as `1`. Matching pods without an assigned node are excluded. (Default: `false`, Optional)
- `activationValue` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional, This value can be a float)

> 💡 **Note:** The search scope is limited to the namespace where the `ScaledObject` is deployed.

The count excludes terminated pods, i.e. [pod status](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#podstatus-v1-core) `phase` equals `Succeeded` or `Failed`.

When `groupByNode` is enabled, KEDA groups matching non-terminated pods by node and excludes matching pods without a node assignment. For example, if `7` matching pods are found and `2` of them run on the same node, the scaler reports `6`.

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
      groupByNode: 'true'
```
