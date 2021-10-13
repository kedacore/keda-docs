+++
title = "NATS Streaming"
layout = "scaler"
availability = "v1.0+"
maintainer = "Community"
description = "Scale applications based on NATS Streaming."
go_file = "stan_scaler"
+++

### Trigger Specification

This specification describes the `stan` trigger for NATS Streaming.

```yaml
triggers:
- type: stan
  metadata:
    natsServerMonitoringEndpoint: "stan-nats-ss.stan.svc.cluster.local:8222"
    queueGroup: "grp1"
    durableName: "ImDurable"
    subject: "Test"
    lagThreshold: "10"
```

**Parameter list:**

- `natsServerMonitoringEndpoint` - Location of the Nats Streaming monitoring endpoint.
- `queueGroup` - Name of queue group of the subscribers.
- `durableName` - Name of durability used by subscribers.
- `subject` - Name of the channel.
- `lagThreshold` - Average target value to trigger scaling actions.

### Authentication Parameters

**Connection Authentication:**

Not supported yet.

### Example

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: stan-scaledobject
  namespace: gonuts
spec:
  pollingInterval: 10   # Optional. Default: 30 seconds
  cooldownPeriod: 30   # Optional. Default: 300 seconds
  minReplicaCount: 0   # Optional. Default: 0
  maxReplicaCount: 30  # Optional. Default: 100  
  scaleTargetRef:
    name: gonuts-sub
  triggers:
  - type: stan
    metadata:
      natsServerMonitoringEndpoint: "stan-nats-ss.stan.svc.cluster.local:8222"
      queueGroup: "grp1"
      durableName: "ImDurable"
      subject: "Test"
      lagThreshold: "10"
```