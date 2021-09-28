+++
title = "Apache Kafka"
layout = "scaler"
availability = "v1.0+"
maintainer = "Microsoft"
description = "Scale applications based on an Apache Kafka topic or other services that support Kafka protocol."
go_file = "kafka_scaler"
+++

> **Notice:** 
> - No. of replicas will not exceed the number of partitions on a topic. That is, if `maxReplicaCount` is set more than number of partitions, the scaler won't scale up to target maxReplicaCount. 
> - This is so because if there are more number of consumers than the number of partitions in a topic, then extra consumer will have to sit idle.

### Trigger Specification

This specification describes the `kafka` trigger for an Apache Kafka topic.

```yaml
triggers:
- type: kafka
  metadata:
    bootstrapServers: kafka.svc:9092
    consumerGroup: my-group
    topic: test-topic
    lagThreshold: '5'
    offsetResetPolicy: latest
```

**Parameter list:**

- `bootstrapServers` - Comma separated list of Kafka brokers "hostname:port" to connect to for bootstrap.
- `consumerGroup` - Name of the consumer group used for checking the offset on the topic and processing the related lag.
- `topic` - Name of the topic on which processing the offset lag.
- `lagThreshold` - Average target value to trigger scaling actions. (default: 10)
- `offsetResetPolicy` - The offset reset policy for the consumer. Options are `latest` or `earliest` (default: `latest`)

### Authentication Parameters

 You can use `TriggerAuthentication` CRD to configure the authenticate by providing `sasl`, `username` and `password`, in case your Kafka cluster has SASL authentication turned on. If TLS is required you should set `tls` to `enable`. If required for your Kafka configuration, you may also provide a `ca`, `cert` and `key`. `cert` and `key` must be specified together.

**Credential based authentication:**

**SASL:**

- `sasl` - Kafka SASL auth mode. Optional. If not set, SASL for Kafka is not used. If set, it must be one of `plaintext`, `scram_sha256` or `scram_sha512`.
- `username` - Optional. If `sasl` is set, this is required.
- `password` - Optional. If `sasl` is set, this is required.

**TLS:**

- `tls` - Optional. To enable SSL auth for Kafka, set this to `enable`. If not set, TLS for Kafka is not used.
- `ca` - Certificate authority file for TLS client authentication. Optional.
- `cert` - Certificate for client authentication. Optional. Required if `key` is specified.
- `key` - Key for client authentication. Optional. Required if `cert` is specified.

### New Consumers and Offset Reset Policy

When a new Kafka consumer is created, it must determine its consumer group initial position, i.e. the offset it will start to read from. The position is decided in Kafka consumers via a parameter `auto.offset.reset` and the possible values to set are `latest` (Kafka default), and `earliest`. This parameter in KEDA should be set accordingly. In this initial status, no offset has been committed to Kafka for the consumer group and any request for offset metadata will return an `INVALID_OFFSET`; so KEDA has to manage the consumer pod's autoscaling in relation to the offset reset policy that has been specified in the parameters:

- If the policy is set to `earliest` (a new consumer wants to replay everything in the topic from its beginning) and no offset is committed, the scaler will return a lag value equal to the last offset in the topic (in the case of a new topic, 0), so it will scale the deployment to 0 replicas. If a new message is produced to the topic, KEDA will return the new value of the offset (1), and will scale the deployments to consume the message.
- If the policy is set to `latest` (so the new consumer will only consume new messages) and no offset is committed, the scaler will return a negative lag value, and will also tell the HPA to remain `active`, hence the deployment should have the minimum number of replicas running. This is to allow the consumer to read any new message on the topic, and commit its offset.

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
