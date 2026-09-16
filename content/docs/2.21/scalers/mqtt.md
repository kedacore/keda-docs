+++
title = "MQTT"
availability = "v2.18+"
maintainer = "Community"
category = "Messaging"
description = "Scale applications based on the rate of incoming MQTT messages on a topic."
go_file = "mqtt_scaler"
+++

### Trigger Specification

This specification describes the `mqtt` trigger that scales based on the rate of MQTT messages
arriving on a subscribed topic within a sliding time window.

Unlike most scalers, the MQTT scaler is a **push scaler**: KEDA subscribes to the broker and
counts arriving messages rather than polling a queue depth, because the MQTT protocol does not
expose a queryable queue length.

```yaml
triggers:
- type: mqtt
  metadata:
    brokerAddress: "tcp://mosquitto:1883"
    topic: "sensors/temperature"
    queryValue: "100"
    windowSeconds: "30"
    qos: "1"
```

**Parameter list:**

- `brokerAddress` - Full broker URL including scheme and port, e.g. `tcp://host:1883` or
  `ssl://host:8883`. **Required.**
- `topic` - MQTT topic to subscribe to. Wildcards (`+`, `#`) are supported. **Required.**
- `queryValue` - Target message count per window that the HPA uses to decide replica count.
  The scaler reports the number of messages received in the last `windowSeconds` seconds;
  KEDA scales so that each replica handles approximately `queryValue` messages. **Required.**
- `windowSeconds` - Length of the sliding window in seconds. Messages older than this are
  discarded from the count. (Default: `30`, Optional)
- `qos` - MQTT QoS level for the subscription: `0`, `1`, or `2`. (Default: `1`, Optional)
- `connectRetryIntervalSeconds` - Initial retry interval in seconds when the broker is
  unreachable. (Default: `2`, Optional)
- `maxReconnectIntervalSeconds` - Maximum backoff interval in seconds between reconnect
  attempts. (Default: `60`, Optional)
- `enableTLS` - Set to `true` to enable TLS for the broker connection. (Default: `false`,
  Optional)
- `unsafeSsl` - Set to `true` to skip TLS certificate verification. Not recommended for
  production. (Default: `false`, Optional)

### Authentication Parameters

Credentials are supplied via `TriggerAuthentication`.

**Username/password authentication:**

- `username` - MQTT username. (Optional)
- `password` - MQTT password. (Optional)

**mTLS / TLS client certificate authentication** (requires `enableTLS: "true"`):

- `ca` - PEM-encoded CA certificate for broker verification. (Optional)
- `cert` - PEM-encoded client certificate. (Optional)
- `key` - PEM-encoded client private key. (Optional)
- `keyPassword` - Passphrase for the client private key. (Optional)

### Activation

The scaler reports as **active** when either:

- at least one non-retained message has arrived within the current window, **or**
- a retained message has been seen on the topic within the current window.

This means a topic that carries a persistent retained value keeps the workload running even
when the live message rate drops to zero.

### Example

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mqtt-secret
type: Opaque
data:
  mqtt-username: bXl1c2Vy          # base64("myuser")
  mqtt-password: bXlwYXNzd29yZA==  # base64("mypassword")
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: trigger-auth-mqtt
spec:
  secretTargetRef:
  - parameter: username
    name: mqtt-secret
    key: mqtt-username
  - parameter: password
    name: mqtt-secret
    key: mqtt-password
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: mqtt-scaledobject
spec:
  scaleTargetRef:
    name: my-deployment
  minReplicaCount: 0
  maxReplicaCount: 10
  triggers:
  - type: mqtt
    metadata:
      brokerAddress: "tcp://mosquitto.default:1883"
      topic: "sensors/temperature"
      queryValue: "100"       # target: one replica per 100 msgs/window
      windowSeconds: "30"
      qos: "1"
    authenticationRef:
      name: trigger-auth-mqtt
```
