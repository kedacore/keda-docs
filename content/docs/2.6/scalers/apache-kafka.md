+++
title = "Apache Kafka"
layout = "scaler"
availability = "v1.0+"
maintainer = "Microsoft"
description = "Scale applications based on an Apache Kafka topic or other services that support Kafka protocol."
go_file = "kafka_scaler"
+++

> **Notice:**
> - By default, the number of replicas will not exceed:
>   - The number of partitions on a topic when a topic is specified;
>   - The number of partitions of *all topics* in the consumer group when no topic is specified;
>
>   That is, if `maxReplicaCount` is set more than number of partitions, the scaler won't scale up to target maxReplicaCount. See `allowIdleConsumers` below to disable this default behavior.
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
    allowIdleConsumers: false
    version: 1.0.0
```

**Parameter list:**

- `bootstrapServers` - Comma separated list of Kafka brokers "hostname:port" to connect to for bootstrap.
- `consumerGroup` - Name of the consumer group used for checking the offset on the topic and processing the related lag.
- `topic` - Name of the topic on which processing the offset lag. (Optional)

  > **Note:**
  >
  > When `topic` is unspecified, total offset lag will be calculated with all topics within the consumer group.
  > - When there are **active** consumer instances, _all topics_ includes:
  >   - Topics the consumer is *currently* subscribing to;
  >   - Topics that the consumer group *had prior commit history* (up to retention period for `__consumer_offset`, default to 7 days, see [KIP-186](https://cwiki.apache.org/confluence/display/KAFKA/KIP-186%3A+Increase+offsets+retention+default+to+7+days));
  > - When there are **no active** consumer instances, _all topics_ only includes topics that the consumer group *had prior commit history*;
  > ---
  > An edge case exists where scaling could be **effectively disabled**:
  >    - Consumer never makes a commit (no record in `__consumer_offset`);
  >    - and `ScaledObject` had `minReplicaCount` as 0;
  >
  >   In such case, Keda could scale the consumer down to 0 when there is no lag and won't be able scale up due to the topic could not be auto discovered.
  >
  > Fix for such case:
  >  - Set `minReplicaCount` > 0;
  >  - or use multiple triggers where one supplies `topic` to ensure lag for that topic will always be detected;


- `lagThreshold` - Average target value to trigger scaling actions. (Default: `5`, Optional)
- `offsetResetPolicy` - The offset reset policy for the consumer. (Values: `latest`, `earliest`, Default: `latest`, Optional)
- `allowIdleConsumers` - When set to `true`, the number of replicas can exceed the number of
partitions on a topic, allowing for idle consumers. (Default: `false`, Optional)
- `version` - Version of your Kafka brokers. See [samara](https://github.com/Shopify/sarama) version (Default: `1.0.0`, Optional)

### Authentication Parameters

 You can use `TriggerAuthentication` CRD to configure the authenticate by providing `sasl`, `username` and `password`, in case your Kafka cluster has SASL authentication turned on. If TLS is required you should set `tls` to `enable`. If required for your Kafka configuration, you may also provide a `ca`, `cert` and `key`. `cert` and `key` must be specified together.

**Credential based authentication:**

**SASL:**

- `sasl` - Kafka SASL auth mode. (Values: `plaintext`, `scram_sha256` or `scram_sha512`, `none`, Default: `none`, Optional)
- `username` - Username used for sasl authentication. (Optional)
- `password` - Password used for sasl authentication. (Optional)

**TLS:**

- `tls` - To enable SSL auth for Kafka, set this to `enable`. If not set, TLS for Kafka is not used. (Values: `true`, `false`, Default: `false`, Optional)
- `ca` - Certificate authority file for TLS client authentication. (Optional)
- `cert` - Certificate for client authentication. (Optional)
- `key` - Key for client authentication. (Optional)

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
