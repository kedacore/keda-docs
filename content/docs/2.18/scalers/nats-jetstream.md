+++
title = "NATS JetStream"
layout = "scaler"
availability = "v2.8+"
maintainer = "Community"
category = "Messaging"
description = "Scale applications based on NATS JetStream."
go_file = "nats_jetstream_scaler"
+++

### Trigger Specification

This specification describes the `nats-jetstream` trigger for NATS JetStream.

```yaml
triggers:
- type: nats-jetstream
  metadata:
    natsServerMonitoringEndpoint: "nats.nats.svc.cluster.local:8222"
    account: "$G"
    stream: "mystream"
    consumer: "pull_consumer"
    lagThreshold: "10"
    activationLagThreshold: "15"
    useHttps: "false"
```

**Parameter list:**

- `natsServerMonitoringEndpoint` - Location of the NATS server monitoring endpoint.
- `account` - Name of the NATS account. "$G" is default when no account is configured.
- `stream` - Name of the JS stream within the account.
- `consumer` - Name of the consumer for a given stream.
- `lagThreshold` - Average target value to trigger scaling actions.
- `activationLagThreshold` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)
- `useHttps` - Specifies if the NATS server monitoring endpoint is using HTTPS. (Default: `false`, Optional)

### Authentication Parameters

Some parameters of the JetStream details can be pulled from `TriggerAuthentication` objects:

- `natsServerMonitoringEndpoint` - Location of the NATS Streaming monitoring endpoint.
- `account` - Name of the NATS account. "$G" is default when no account is configured.

### Example

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: nats-jetstream-scaledobject
  namespace: nats-jetstream
spec:
  pollingInterval: 3   # Optional. Default: 30 seconds
  cooldownPeriod: 10   # Optional. Default: 300 seconds
  minReplicaCount: 0   # Optional. Default: 0
  maxReplicaCount: 2   # Optional. Default: 100
  scaleTargetRef:
    name: sub
  triggers:
  - type: nats-jetstream
    metadata:
      natsServerMonitoringEndpoint: "nats.nats.svc.cluster.local:8222"
      account: "$G"
      stream: "mystream"
      consumer: "pull_consumer"
      lagThreshold: "10"
      activationLagThreshold: "15"
      useHttps: "false"
```
