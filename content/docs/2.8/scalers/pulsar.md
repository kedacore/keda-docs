+++
title = "Apache Pulsar"
availability = "v2.8"
maintainer = "Community"
description = "Scale applications based on an Apache Pulsar topic subscription."
layout = "scaler"
+++

### Trigger Specification

This specification describes the `pulsar` trigger for an Apache Pulsar topic.

```yaml
triggers:
- type: pulsar
  metadata:
    adminURL: http://localhost:80
    topic: persistent://public/default/my-topic
    subscription: sub1
    msgBacklogThreshold: '5'
    activationMsgBacklogThreshold: '2'
```

**Parameter list:**

- `adminURL` - Stats URL of the admin API for your topic.
- `topic` - Pulsar topic. format of `persistent://{tenant}/{namespace}/{topicName}`
- `subscription` - Name of the topic subscription
- `msgBacklogThreshold` - Average target value to trigger scaling actions. (default: 10)
- `activationMsgBacklogThreshold` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional)

### Authentication Parameters

  If TLS is required you should set `tls` to `enable`. If required for your Pulsar configuration, you may also provide a `ca`, `cert` and `key`. `ca`, `cert` and `key` must be specified together.


**TLS:**

- `tls`: Optional. To enable SSL auth for Pulsar, set this to `enable`. If not set, TLS for Pulsar is not used, Your shoule set this key to trigger metadata.
- `ca`: Certificate authority file for TLS client authentication. 
- `cert`: Certificate for client authentication.
- `key`: Key for client authentication. 

### Example

Your pulsar cluster no TLS auth:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: pulsar-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: pulsar-consumer
  pollingInterval: 30
  triggers:
  - type: pulsar
    metadata:
      adminURL: http://localhost:80
      topic: persistent://public/default/my-topic
      subscription: sub1
      msgBacklogThreshold: '5'
```

Your pulsar cluster turn on TLS auth:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-pulsar-secrets
  namespace: default
data:
  ca: <your ca>
  cert: <your cert>
  key: <your key>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-pulsar-credential
  namespace: default
spec:
  secretTargetRef:
  - parameter: ca
    name: keda-pulsar-secrets
    key: ca
  - parameter: cert
    name: keda-pulsar-secrets
    key: cert
  - parameter: key
    name: keda-pulsar-secrets
    key: key
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: pulsar-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: pulsar-consumer
  pollingInterval: 30
  triggers:
  - type: pulsar
    metadata:
      tls: "enable"
      adminURL: https://localhost:8443
      topic: persistent://public/default/my-topic
      subscription: sub1
      msgBacklogThreshold: '5'
    authenticationRef:
      name:  keda-trigger-auth-pulsar-credential
```
