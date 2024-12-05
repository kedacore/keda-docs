+++
title = "Etcd"
availability = "v2.9+"
maintainer = "Huawei Cloud"
description = "Scale applications based on an etcd key-value pair. By watching an etcd key, a passively received push mode, the scaler can activate applications with lower load usage than frequent pull mode"
go_file = "etcd_scaler"
+++

### Trigger Specification

This specification describes the `etcd` trigger that scales based on an etcd key-value pair.

```yaml
  triggers:
    - type: etcd
      metadata:
        endpoints: 172.0.0.1:2379,172.0.0.2:2379,172.0.0.3:2379
        watchKey: length
        value: '5.5'
        activationValue: '0.5'
        watchProgressNotifyInterval: '600'
```

**Parameter list:**

- `endpoints` - Etcd servers' endpoints information. It supports multiple endpoints split by a comma character (`,`).
- `watchKey` - Name of the etcd key used for the scaler client to get/watch the etcd value from etcd servers.
- `value` - Target relation between the scaled workload and the etcd value. It will be calculated following this formula: relation = (etcd value) / (scaled workload pods). (This value can be a float)
- `activationValue` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional, This value can be a float)
- `watchProgressNotifyInterval` - Set this parameter to the same as `--experimental-watch-progress-notify-interval` parameter of etcd servers. (Default: `600`, units are seconds, Optional)

### Authentication Parameters

You can use `TriggerAuthentication` CRD to configure the authenticate by tls. It is required you should set `tls` to `enable`. If required for your etcd configuration, you may also provide a `ca`, `cert`, `key` and `keyPassword`. `cert` and `key` must be specified together.

**Credential based authentication:**

**TLS:**

- `tls` - To enable SSL auth for etcd, set this to `enable`. If not set, TLS for etcd is not used. (Values: `enable`, `disable`, Default: `disable`, Optional)
- `ca` - Certificate authority file for TLS client authentication. (Optional)
- `cert` - Certificate for client authentication. (Optional)
- `key` - Key for client authentication. (Optional)
- `keyPassword` - If set the `keyPassword` is used to decrypt the provided `key`. (Optional)

### Example

Your etcd cluster no TLS auth:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: etcd-scaledobject
spec:
  scaleTargetRef:
    name: my-app-target
  pollingInterval: 30
  triggers:
    - type: etcd
      metadata:
        endpoints: 172.0.0.1:2379,172.0.0.2:2379,172.0.0.3:2379
        watchKey: length
        value: '5.5'
```

Your etcd cluster turn on SASL/TLS auth:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-etcd-secrets
  namespace: default
data:
  tls: ZW5hYmxl
  ca: <your ca>
  cert: <your cert>
  key: <your key>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-etcd-credential
  namespace: default
spec:
  secretTargetRef:
    - parameter: tls
      name: keda-etcd-secrets
      key: tls
    - parameter: ca
      name: keda-etcd-secrets
      key: ca
    - parameter: cert
      name: keda-etcd-secrets
      key: cert
    - parameter: key
      name: keda-etcd-secrets
      key: key
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: etcd-scaledobject
spec:
  scaleTargetRef:
    name: my-app-target
  pollingInterval: 30
  triggers:
    - type: etcd
      metadata:
        endpoints: 172.0.0.1:2379,172.0.0.2:2379,172.0.0.3:2379
        watchKey: length
        value: '5.5'
      authenticationRef:
        name: keda-trigger-auth-etcd-credential
```
