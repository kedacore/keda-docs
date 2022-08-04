+++
title = "Liiklus Topic"
availability = "v1.0+"
maintainer = "Community"
description = "Scale applications based on Liiklus Topic."
go_file = "liiklus_scaler"
+++

### Trigger Specification

This specification describes the `liiklus` trigger for Liiklus Topic.

```yaml
triggers:
- type: liiklus
  metadata:
    # Required
    address: localhost:6565
    group: my-group
    topic: test-topic
    # Optional
    lagThreshold: "50"
    # Optional
    activationLagThreshold: "20"
    groupVersion: 1
```

**Parameter list:**

- `address` - Address of the gRPC liiklus API endpoint.
- `group` - Name of consumer group.
- `topic` - Topic to monitor and scale based on `lagThreshold`.
- `lagThreshold` - Value to trigger scaling actions for. (Default: `10`, Optional)
- `activationLagThreshold` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional)
- `groupVersion` - Version of the group to consider when looking at messages. See [docs](https://github.com/bsideup/liiklus/blob/22efb7049ebcdd0dcf6f7f5735cdb5af1ae014de/app/src/test/java/com/github/bsideup/liiklus/GroupVersionTest.java). (Default: `0`, Optional)

### Authentication Parameters

Not supported yet.

### Example

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: liiklus-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: function-deployment
  pollingInterval: 30
  triggers:
  - type: liiklus
    metadata:
      # Required
      address: localhost:6565
      group: my-group       # Make sure that this consumer group name is the same one as the one that is consuming topics
      topic: test-topic
      # Optional
      lagThreshold: "50"    # Default value is set to 10
```
