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
    natsServerMonitoringEndpoint: "stan-nats-ss.stan.svc.cluster.local:8222" # Location of the Nats Streaming monitoring endpoint
    queueGroup: "grp1" # Queue group name of the subscribers
    durableName: "ImDurable" # Must identify the durability name used by the subscribers
    subject: "Test" # Name of channel
    lagThreshold: "10" # Configures the TargetAverageValue on the Horizontal Pod Autoscaler (HPA)).
```

### Authentication Parameters

Not supported yet.

### Example

```yaml
apiVersion: keda.k8s.io/v1alpha1
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
    deploymentName: gonuts-sub
  triggers:
  - type: stan
    metadata:
      natsServerMonitoringEndpoint: "stan-nats-ss.stan.svc.cluster.local:8222"
      queueGroup: "grp1"
      durableName: "ImDurable"
      subject: "Test"
      lagThreshold: "10"
```
