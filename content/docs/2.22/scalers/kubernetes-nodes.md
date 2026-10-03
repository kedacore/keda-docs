+++
title = "Kubernetes Nodes"
availability = "v2.22+"
maintainer = "Community"
category = "Kubernetes"
description = "Scale applications based on the number of schedulable Ready Kubernetes nodes"
go_file = "kubernetes_nodes_scaler"
+++

### Trigger Specification

This trigger scales a workload with the number of nodes. When nodes join, replicas go up. When nodes leave, replicas go down.

Only schedulable Ready nodes are counted. Cordoned, draining and `NotReady` nodes are ignored. This matches cluster-proportional-autoscaler. When a node turns `NotReady` or is cordoned, the count drops and replicas follow down, subject to `cooldownPeriod` and HPA stabilization.

```yaml
triggers:
- type: kubernetes-nodes
  metadata:
    nodeSelector: "kubernetes.io/os=linux"
    value: "1"
    activationValue: "0"
    levels: "1,3,5"
```

**Parameter list:**

- `nodeSelector` - Only nodes with these labels are counted. Example: `role=worker`. Empty counts all schedulable Ready nodes. Match it to where the workload can run. (Optional)
- `value` - Nodes per replica. `1` means one replica per node. Can be a float, must be greater than 0. (Default: `1`, Optional)
- `activationValue` - The scaler is active only above this count. Learn more about activation in [activation and scaling thresholds](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)
- `levels` - Fixed steps, e.g. `"1,3,5"`. Node counts 0..6 then give replicas 0,1,1,3,3,5,5. Use it for quorum systems that need odd numbers, and `"1,3"` to cap at 3 replicas. Zero stays zero (the target must accept 0). A count below the first level gives the first level, so extra replicas pend until nodes join. Empty keeps linear. Keep `value: "1"` when levels are set. Cannot combine with `oddOnly`. (Optional)
- `oddOnly` - Round down to the nearest odd number: 0..7 nodes give replicas 0,1,1,3,3,5,5,7, with no upper cap. Use it for unbounded scaling that must always keep an odd quorum. Cannot combine with `levels`. (Default: `false`, Optional)

### Authentication Parameters

None. The KEDA operator lists nodes with its own permissions. It needs `get`, `list` and `watch` on `nodes` (already in the default ClusterRole).

### Example: follow nodes with a StatefulSet

This is a full example. The workload uses `Parallel` and a placement rule (both are required, see below). The ScaledObject follows the node count between 1 and 10.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: ingester
  namespace: demo
spec:
  serviceName: ingester
  replicas: 1
  podManagementPolicy: Parallel
  selector:
    matchLabels:
      app: ingester
  template:
    metadata:
      labels:
        app: ingester
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app: ingester
            topologyKey: kubernetes.io/hostname
      containers:
      - name: ingester
        image: my-registry/ingester:1.0
        ports:
        - containerPort: 3200
        volumeMounts:
        - name: data
          mountPath: /var/lib/ingester
  persistentVolumeClaimRetentionPolicy:
    whenScaled: Retain
    whenDeleted: Retain
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-shared
      resources:
        requests:
          storage: 10Gi
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: ingester-follower
  namespace: demo
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: ingester
  pollingInterval: 15
  cooldownPeriod: 300
  minReplicaCount: 1
  maxReplicaCount: 10
  triggers:
  - type: kubernetes-nodes
    metadata:
      value: "1"
```

With 1 node the target runs 1 replica. Each new node adds 1 replica, up to 10.

### Example: quorum steps

Quorum systems need odd numbers (1, 3, 5). `levels` maps the node count onto those steps. Below is the trigger part only — the ScaledObject around it looks like the example above.

```yaml
triggers:
- type: kubernetes-nodes
  metadata:
    value: "1"
    levels: "1,3,5"
```

Node counts 0..6 give replicas 0,1,1,3,3,5,5. With 2 nodes the target stays at 1. With 4 nodes it stays at 3. Use `levels: "1,3"` to cap at 3 replicas. For scaling without a cap that still keeps an odd quorum at any size, use `oddOnly: "true"` instead — 0..7 nodes give 0,1,1,3,3,5,5,7 and so on. The two cannot be combined.

### Example: scale up only

Some StatefulSets must never scale down on their own (example: `OrderedReady` or data that needs manual care). This ScaledObject follows nodes up and never scales down. Scale-down stays manual.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: db-follower
  namespace: demo
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: mydb
  minReplicaCount: 1
  maxReplicaCount: 5
  advanced:
    horizontalPodAutoscalerConfig:
      behavior:
        scaleDown:
          selectPolicy: Disabled
  triggers:
  - type: kubernetes-nodes
    metadata:
      value: "1"
```

### Example: floor plus load

Put the nodes trigger and a load trigger in one ScaledObject. HPA takes the larger of the two. The node count is the floor. It keeps quorum while idle. Load bursts above it when busy.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: worker-follower
  namespace: demo
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: worker
  minReplicaCount: 1
  maxReplicaCount: 10
  fallback:
    failureThreshold: 3
    replicas: 3
  triggers:
  - type: kubernetes-nodes
    name: nodes
    metadata:
      value: "1"
  - type: prometheus
    name: load
    metadata:
      serverAddress: http://prometheus.monitoring.svc:9090
      metricName: queue_depth
      query: sum(queue_depth{job="worker"})
      threshold: "100"
```

Notes on this example:

- `fallback.replicas: 3` keeps quorum if the metrics fail. Set it to your quorum size.
- A burst above the node count pends under `required` affinity. That pending is node pressure: a cluster-autoscaler can add a node, then the floor rises and the pending pods schedule. Under `preferred` affinity the burst pods pile onto existing nodes instead.

### Example: ceiling with a composite formula

To cap load at the node count instead (never more replicas than nodes), use a composite ceiling in its own ScaledObject. The formula sees raw metric values, so the query already divides by the threshold: each unit of `load` means one replica. Do not add a static `fallback` here — it bypasses the formula on metric failure.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: worker-ceiling
  namespace: demo
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: worker
  minReplicaCount: 1
  maxReplicaCount: 10
  triggers:
  - type: kubernetes-nodes
    name: nodes
    metadata:
      value: "1"
  - type: prometheus
    name: load
    metadata:
      serverAddress: http://prometheus.monitoring.svc:9090
      metricName: queue_depth
      query: sum(queue_depth{job="worker"}) / 100
      threshold: "100"
  advanced:
    scalingModifiers:
      formula: "nodes < load ? nodes : load"
      target: "1"
```

Give both triggers a `name` (`nodes`, `load`) so the formula can use them.

### Target the operator resource, not the child workload

For operator-managed stores, point `scaleTargetRef` at the operator custom resource. It must expose the `/scale` subresource. HPA only sets the count. The operator owns member join, leader election, data sync and graceful removal. Never point at the StatefulSet underneath. It fights the operator. For operators that themselves run a plain `OrderedReady` StatefulSet, prefer scale-up-only: a lost middle node stalls their scale-down until the node returns.

### Plain StatefulSets: Parallel or scale-up-only

A plain `StatefulSet` with `podManagementPolicy: OrderedReady` blocks scale-down. `OrderedReady` is the default when the field is missing. A Pending lower pod stops the removal of higher pods. Or a healthy higher pod is removed to make room. Both are bad.

KEDA denies such ScaledObjects with a clear error. At runtime it holds them instead (`ScaledObjectTargetOrderedReady` event, no HPA). Three escapes exist:

- `podManagementPolicy: Parallel` for follow up and down,
- scale-up-only (see example above),
- fixed size (`minReplicaCount` equals `maxReplicaCount`).

A good vanilla target looks like the ingester above: `Parallel`, one portable PVC per Pod, drain on shutdown that flushes buffered data to object storage first, required anti-affinity.

### Storage

Each Pod needs storage that can reattach on another node. One volume per Pod never attaches to two Pods at once, so per-Pod claims do not need simultaneous sharing — they need portability. Zone-bound block volumes need delayed binding (`WaitForFirstConsumer`) plus zone spread. Then a rescheduled Pod reattaches its volume in its zone. Cluster-wide shared volumes follow anywhere. The storage driver handles parallel attach calls. Shared access matters only when replicas read and write the same data.

`local` volumes pin data to one machine through node affinity: a replacement Pod pends because it cannot move to the data. `hostPath` has the opposite failure: the Pod can run on another node and find different or empty data, which is a silent integrity risk, not a pending Pod. Neither works here.

Only PersistentVolumeClaims survive scale-down, and only under the StatefulSet retention policy (`persistentVolumeClaimRetentionPolicy.whenScaled`, shown as `Retain` in the example above) plus the volume reclaim policy. Pod-local `emptyDir` data is lost when Pods go away.

### Pending by design

`minReplicaCount` (or a `levels` floor) above the node count is valid. Extra replicas pend until nodes join. This is node pressure, not breakage. The volumes must still be portable.

### Placement

The trigger only sets the replica count. It never places pods. Without anti-affinity or topology spread, pods pile onto few nodes. The count is then meaningless.

KEDA denies targets with neither rule, at admission and at runtime (`ScaledObjectTargetNoPlacement` event, no HPA). Operator resources without a pod template are exempt. Their operator owns placement.

```yaml
spec:
  template:
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app: my-stateful-app
            topologyKey: kubernetes.io/hostname
```

### More replicas than nodes

`required` means at most one pod per node. For several pods per node, use `preferred` anti-affinity or a soft spread instead. Either one passes the placement check. Pods then pack onto the nodes you have.

```yaml
spec:
  template:
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: worker
              topologyKey: kubernetes.io/hostname
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: worker
```

Pair it with a fractional `value`. `value: "0.5"` means two replicas per node. With 3 nodes the target runs 6 replicas.
