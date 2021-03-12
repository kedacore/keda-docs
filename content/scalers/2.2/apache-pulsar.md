+++
title = "Apache Pulsar"
availability = "v2.2"
maintainer = "TIBCO"
description = "Scale applications based on an Apache Pulsar topic subscription."
layout = "scaler"
+++

### Trigger Specification

This specification describes the `pulsar` trigger for an Apache Pulsar topic.

```yaml
triggers:
- type: pulsar
  metadata:
    statsURL: http://localhost:80/admin/v2/persistent/apache/pulsar/my-topic/stats
    tenant: apache
    namespace: pulsar
    topic: my-topic
    subscription: sub1
    msgBacklogThreshold: '5'
```

**Parameter list:**

- `statsURL` - Stats URL of the admin API for your topic.
- `tenant` - Name of the tenant.
- `namespace` - Name of the namespace.
- `topic` - Name of the topic.
- `subscription` - Name of the topic subscription
- `msgBacklogThreshold` - Average target value to trigger scaling actions. (default: 10)

### Authentication Parameters

  If TLS is required you should set `tls` to `enable`. If required for your Pulsar configuration, you may also provide a `ca`, `cert` and `key`. `ca`, `cert` and `key` must be specified together.


**TLS:**

- `tls`: Optional. To enable SSL auth for Pulsar, set this to `enable`. If not set, TLS for Pulsar is not used.
- `ca`: Certificate authority file for TLS client authentication. 
- `cert`: Certificate for client authentication.
- `key`: Key for client authentication. 

### Example

Your kafka cluster no SASL/TLS auth:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: pulsar-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: azure-functions-deployment
  pollingInterval: 30
  triggers:
  - type: pulsar
    metadata:
      statsURL: http://localhost:80/admin/v2/persistent/apache/pulsar/my-topic/stats
      tenant: apache
      namespace: pulsar
      topic: my-topic
      subscription: sub1
      msgBacklogThreshold: '5'
```

Your kafka cluster turn on SASL/TLS auth:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-pulsar-secrets
  namespace: default
data:
  tls: "enable"
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
  - parameter: tls
    name: keda-pulsar-secrets
    key: tls
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
    name: azure-functions-deployment
  pollingInterval: 30
  triggers:
  - type: pulsar
    metadata:
      statsURL: https://localhost:8443/admin/v2/persistent/apache/pulsar/my-topic/stats
      tenant: apache
      namespace: pulsar
      topic: my-topic
      subscription: sub1
      msgBacklogThreshold: '5'
    authenticationRef:
      name: keda-trigger-auth-pulsar-credential
```
