+++
title = "NATS Streaming"
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
    activationLagThreshold: "5"
    useHttps: "false"
```

**Parameter list:**

- `natsServerMonitoringEndpoint` - Location of the Nats Streaming monitoring endpoint.
- `queueGroup` - Name of queue group of the subscribers.
- `durableName` - Name of durability used by subscribers.
- `subject` - Name of the channel.
- `lagThreshold` - Average target value to trigger scaling actions.
- `activationLagThreshold` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)
- `useHttps` - Specifies if the NATS Streaming monitoring endpoint is using HTTPS. (Default: `false`, Optional)

### Authentication Parameters

You can authenticate with the NATS streaming server by using connection string authentication via `TriggerAuthentication` configuration.

- `natsServerMonitoringEndpoint` - Location of the NATS Streaming monitoring endpoint.

**TLS Authentication**

- `tls` - To enable SSL auth for nats-streaming, set this to `enable`. If not set, TLS for nats-streaming is not used. (Values: `enable`, `disable`, Default: `disable`, Optional)
- `ca` - Certificate authority file for TLS client authentication. (Optional)
- `cert` - Certificate for client authentication. (Optional)
- `key` - Key for client authentication. (Optional)

### Example without any TriggerAuthentication

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: stan-scaledobject
  namespace: example
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
      useHttps: "false"
```
#### Example with no TLS

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: stan-secret
  namespace: example
type: Opaque
data:
  stan_endpoint: <base-64-encoded-endpoint>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-stan-secret
  namespace: example
spec:
  secretTargetRef:
  - parameter: natsServerMonitoringEndpoint
    name: stan-secret
    key: stan_endpoint
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: stan-scaledobject
  namespace: example
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
      queueGroup: "grp1"
      durableName: "ImDurable"
      subject: "Test"
      lagThreshold: "10"
    authenticationRef:
      name: keda-trigger-auth-stan-secret
```

#### Example with TLS

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-stan-secrets
  namespace: default
data:
  tls: enable
  ca: <your ca>
  cert: <your cert>
  key: <your key>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-stan-secret
  namespace: default
spec:
  secretTargetRef:
    - parameter: tls
      name: keda-stan-secrets
      key: tls
    - parameter: ca
      name: keda-stan-secrets
      key: ca
    - parameter: cert
      name: keda-stan-secrets
      key: cert
    - parameter: key
      name: keda-stan-secrets
      key: key
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: stan-scaledobject
  namespace: example
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
      queueGroup: "grp1"
      durableName: "ImDurable"
      subject: "Test"
      lagThreshold: "10"
      useHttps: "true"
    authenticationRef:
      name: keda-trigger-auth-stan-secret
```