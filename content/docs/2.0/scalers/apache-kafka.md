+++
title = "Apache Kafka"
layout = "scaler"
availability = "v1.0+"
maintainer = "Microsoft"
description = "Scale applications based on an Apache Kafka topic or other services that support Kafka protocol."
go_file = "kafka_scaler"
+++

### Trigger Specification

This specification describes the `kafka` trigger for an Apache Kafka topic.

```yaml
triggers:
- type: kafka
  metadata:
    # brokerList: kafka.svc:9092 - deprecated
    bootstrapServers: kafka.svc:9092
    consumerGroup: my-group
    topic: test-topic
    lagThreshold: '5'
    offsetResetPolicy: latest
```

**Parameter list:**

- `bootstrapServers`: comma separated list of Kafka brokers "hostname:port" to connect to for bootstrap.
- `consumerGroup`: consumer group used for checking the offset on the topic and processing the related lag.
- `topic`: topic on which processing the offset lag.
- `lagThreshold` How much the stream is lagging on the current consumer group. Default is 10. Optional.
- `offsetResetPolicy` the offset reset policy for the consumer. Can be either "latest" or "earliest". Default is "latest" as in Kafka Consumer defaults.

### Authentication Parameters

 You can use `TriggerAuthentication` CRD to configure the authenticate by providing `sasl`, `username` and `password`, in case your Kafka cluster has SASL authentication turned on. If TLS is required you should set `tls` to `enabled` and provide `ca`, `cert` and `key`.

**Credential based authentication:**

SASL:
- `sasl`: Kafka SASL auth mode. Optional. If not set, SASL for Kafka is not used. If set, it must be one of `plaintext`, `scram_sha256` or `scram_sha512`.
- `username`: Optional. If `sasl` is set, this is required.
- `password`: Optional. If `sasl` is set, this is required.

TLS:
- `tls`: Optional. To enable SSL auth for Kafka, set this to `enable`. If not set, TLS for Kafka is not used.
- `ca`: Certificate authority file for TLS client authentication. Optional. If `tls` is enabled, this is required.
- `cert`: Certificate for client authentication. Optional.If `tls` is enabled, this is required.
- `key`: Key for client authentication. Optional. If `tls` is enabled, this is required.


### Example

Your kafka cluster no SASL/TLS auth:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: azure-functions-deployment
  pollingInterval: 30
  triggers:
  - type: kafka
    metadata:
      bootstrapServers: localhost:9092
      consumerGroup: my-group       # Make sure that this consumer group name is the same one as the one that is consuming topics
      topic: test-topic
      # Optional
      lagThreshold: "50"
      offsetResetPolicy: latest
```

Your kafka cluster turn on SASL/TLS auth:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-kafka-secrets
  namespace: default
data:
  sasl: "plaintext"
  username: "admin"
  password: "admin"
  tls: "enable"
  ca: <your ca>
  cert: <your cert>
  key: <your key>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-kafka-credential
  namespace: default
spec:
  secretTargetRef:
  - parameter: sasl
    name: keda-kafka-secrets
    key: sasl
  - parameter: username
    name: keda-kafka-secrets
    key: username
  - parameter: password
    name: keda-kafka-secrets
    key: password
  - parameter: tls
    name: keda-kafka-secrets
    key: tls
  - parameter: ca
    name: keda-kafka-secrets
    key: ca
  - parameter: cert
    name: keda-kafka-secrets
    key: cert
  - parameter: key
    name: keda-kafka-secrets
    key: key
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: azure-functions-deployment
  pollingInterval: 30
  triggers:
  - type: kafka
    metadata:
      bootstrapServers: localhost:9092
      consumerGroup: my-group       # Make sure that this consumer group name is the same one as the one that is consuming topics
      topic: test-topic
      # Optional
      lagThreshold: "50"
      offsetResetPolicy: latest
    authenticationRef:
      name: keda-trigger-auth-kafka-credential
```
