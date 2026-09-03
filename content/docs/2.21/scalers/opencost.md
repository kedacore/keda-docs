+++
title = "OpenCost"
availability = "v2.21+"
maintainer = "Community"
category = "Metrics"
description = "Scale applications based on Kubernetes cost data from OpenCost."
go_file = "opencost_scaler"
+++

### Trigger Specification

This specification describes the `opencost` trigger that scales based on cost data returned by the [OpenCost](https://www.opencost.io/) allocation API. Here is an example of providing values in metadata:

```yaml
triggers:
- type: opencost
  metadata:
    # Required fields:
    serverAddress: http://opencost.opencost.svc.cluster.local:9003
    costThreshold: '50'
    # Optional fields:
    window: '1h'                      # Default is 1h
    aggregate: 'namespace'            # Default is namespace
    filter: 'namespace:"team-a"'      # Passed through to the OpenCost allocation API
    costType: 'totalCost'             # Default is totalCost
    activationCostThreshold: '5'      # Default is 0
    inverseScaling: 'false'           # Default is false
    unsafeSsl: 'false'                # Default is false
```

**Parameter list:**

- `serverAddress` - URL of the OpenCost API server.
- `costThreshold` - Target cost, in the currency OpenCost is configured with, for HPA scaling decisions. Must be greater than 0. (This value can be a float)
- `window` - Time window for the allocation query. (Values: a number followed by `h`, `d` or `w`, e.g. `1h`, `24h`, `7d`, `1w`. Default: `1h`, Optional)
- `aggregate` - How OpenCost aggregates allocations before the scaler sums them. (Values: `cluster`, `node`, `namespace`, `controllerKind`, `controller`, `service`, `pod`, `container`. Default: `namespace`, Optional)
- `filter` - Filter expression passed verbatim to the OpenCost allocation API, e.g. `namespace:"team-a"`. See the OpenCost API docs for the filter syntax. (Optional)
- `costType` - Which cost field to read from each allocation. (Values: `totalCost`, `cpuCost`, `gpuCost`, `ramCost`, `pvCost`, `networkCost`. Default: `totalCost`, Optional)
- `activationCostThreshold` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional, This value can be a float)
- `inverseScaling` - When `true`, higher cost drives replicas down instead of up. See below. (Values: `true`, `false`, Default: `false`, Optional)
- `unsafeSsl` - Used for skipping certificate check e.g. using self-signed certs. (Values: `true`, `false`, Default: `false`, Optional)

### How the cost is computed

On every poll the scaler calls `GET <serverAddress>/allocation?window=<window>&aggregate=<aggregate>[&filter=<filter>]`, reads the `costType` field from every allocation in the response and sums them. That sum is the metric value.

The value is the accumulated cost over the trailing `window`, not a rate. A short window (`1h`) reacts to changes far faster than a long one (`7d`); long windows only make sense when the scaler is a budget guardrail and slow reaction is acceptable.

Scaling changes future cost, so the loop is slow. Do not use this scaler on its own for latency sensitive workloads. Pair it with a demand based trigger and let `minReplicaCount` set the floor.

### Inverse scaling

With `inverseScaling: "false"` (the default) the cost is reported as-is, so the HPA adds replicas as cost rises above `costThreshold`.

With `inverseScaling: "true"` the reported metric is `costThreshold² / cost`. The HPA target stays at `costThreshold`, so the desired replica count becomes `currentReplicas × costThreshold / cost`. The HPA removes replicas when cost is above the threshold and adds them when it is below. Use this mode to keep a namespace or controller under a spend ceiling. If OpenCost returns a cost of zero or below, the scaler reports `2 × costThreshold` so the HPA scales up rather than dividing by zero.

Activation uses the raw cost in both modes: the scaler is active when cost is above `activationCostThreshold`.

### Authentication Parameters

The OpenCost API has no authentication of its own and this scaler does not send credentials. Reach it over the cluster network or put it behind your own authenticating proxy.

### Example

Keep the `team-a` namespace under $50 per hour and scale the deployment down as cost climbs:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: opencost-scaledobject
  namespace: team-a
spec:
  scaleTargetRef:
    name: worker
  minReplicaCount: 1
  maxReplicaCount: 8
  triggers:
    - type: opencost
      metadata:
        serverAddress: http://opencost.opencost.svc.cluster.local:9003
        window: '1h'
        aggregate: 'namespace'
        filter: 'namespace:"team-a"'
        costThreshold: '50'
        inverseScaling: 'true'
```
