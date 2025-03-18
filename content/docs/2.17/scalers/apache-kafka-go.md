+++
title = "Apache Kafka (Experimental)"
availability = "v2.12+"
maintainer = "Community"
category = "Messaging"
description = "Experimental scaler based on 'segmentio/kafka-go' library. Scale applications based on an Apache Kafka topic or other services that support Kafka protocol."
go_file = "apache_kafka_scaler"
+++

> **Notice:**
> - This is an experimental Kafka scaler based on [kafka-go](https://github.com/segmentio/kafka-go) library.
> - This scaler is not fully compatible with the existing [Kafka scaler](./apache-kafka.md). There are some differences in the configuration and behavior. Please read the documentation carefully before using it. 
> - If you are using OAuth authentication, please use the existing Kafka scaler, as this scaler does not yet support OAuth2 authentication.
> - This scaler has support for AWS MSK IAM based authentication.
> - By default, the number of replicas will not exceed:
>   - The number of partitions on a topic when a topic is specified;
>   - The number of partitions of *all topics* in the consumer group when no topic is specified;
>   - `maxReplicaCount` specified in `ScaledObject`/`ScaledJob`. If not specified, then the default value of `maxReplicaCount` is taken into account;
>   - The number of partitions with non-zero lag if `limitToPartitionsWithLag` is set to `true`
>
>   That is, if `maxReplicaCount` is set more than number of partitions, the scaler won't scale up to target maxReplicaCount. See `allowIdleConsumers` below to disable this default behavior.
> - This is so because if there are more number of consumers than the number of partitions in a topic, then extra consumer will have to sit idle.

### Trigger Specification

This specification describes the `apache-kafka` trigger for an Apache Kafka topic.

```yaml
triggers:
- type: apache-kafka
  metadata:
    bootstrapServers: kafka.svc:9092
    consumerGroup: my-group
    topic: test-topic
    lagThreshold: '5'
    activationLagThreshold: '3'
    offsetResetPolicy: latest
    allowIdleConsumers: false
    scaleToZeroOnInvalidOffset: false
    excludePersistentLag: false
    limitToPartitionsWithLag: false
    partitionLimitation: '1,2,10-20,31'
    tls: enable
    sasl: plaintext
```

**Parameter list:**

- `bootstrapServers` - Comma separated list of Kafka brokers "hostname:port" to connect to for bootstrap.
- `consumerGroup` - Name of the consumer group used for checking the offset on the topic and processing the related lag.
- `topic` - Name of the topic on which processing the offset lag. (Optional, see note below)
- `lagThreshold` - Average target value to trigger scaling actions. (Default: `5`, Optional)
- `activationLagThreshold` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)
- `offsetResetPolicy` - The offset reset policy for the consumer. (Values: `latest`, `earliest`, Default: `latest`, Optional)
- `allowIdleConsumers` - When set to `true`, the number of replicas can exceed the number of
partitions on a topic, allowing for idle consumers. (Default: `false`, Optional)
- `scaleToZeroOnInvalidOffset` - This parameter controls what the scaler does when a partition doesn't have a valid offset.
If 'false' (the default), the scaler will keep a single consumer for that partition. Otherwise ('true'), the consumers for that
partition will be scaled to zero. See the [discussion](https://github.com/kedacore/keda/issues/2612) about this parameter.
- `excludePersistentLag` - When set to `true`, the scaler will exclude partition lag for partitions which current offset is the same as the current offset of the previous polling cycle. This parameter is useful to prevent scaling due to partitions which current offset message is unable to be consumed. If `false` (the default), scaler will include all consumer lag in all partitions as per normal. (Default: `false`, Optional)
- `limitToPartitionsWithLag` - When set to `true`, the number of replicas will not exceed the number of partitions having non-zero lag. `topic` must be specified when this parameter is set to `true`. `allowIdleConsumers` cannot be `true` when this parameter is `true`. (Default: `false`, Optional)
- `partitionLimitation` - Comma separated list of partition ids to scope the scaling on. Allowed patterns are "x,y" and/or ranges "x-y". If set, the calculation of the lag will only take these ids into account.  (Default: All partitions, Optional)
- `sasl` - Kafka SASL auth mode. (Values: `plaintext`, `scram_sha256`, `scram_sha512`, `gssapi`, `aws_msk_iam` or `none`, Default: `none`, Optional). This parameter could also be specified in `sasl` in TriggerAuthentication
- `tls` - To enable SSL auth for Kafka, set this to `enable`. If not set, TLS for Kafka is not used. (Values: `enable`, `disable`, Default: `disable`, Optional). This parameter could also be specified in `tls` in TriggerAuthentication

> **Note:**
>
> When `topic` is unspecified, total offset lag will be calculated with all topics within the consumer group.
> - When there are **active** consumer instances, _all topics_ includes:
>   - Topics the consumer is *currently* subscribing to;
>   - Topics that the consumer group *had prior commit history* (up to retention period for `__consumer_offset`, default to 7 days, see [KIP-186](https://cwiki.apache.org/confluence/display/KAFKA/KIP-186%3A+Increase+offsets+retention+default+to+7+days));
> - When there are **no active** consumer instances, the feature is still a WIP and as such would highly recommend to specify `topic` to avoid unexpected behavior. Namely the scaler will not be able to determine the topics it had subscribed to in the past and will not be able to calculate the lag for those topics.

### Authentication Parameters

 You can use `TriggerAuthentication` CRD to configure the authenticate by providing `sasl`.

 If TLS is required you should set tls to enable. If required for your Kafka configuration, you may also provide a ca, cert, key and keyPassword. cert and key must be specified together. Another alternative is to specify tls and sasl in ScaledObject instead of tls and sasl in TriggerAuthentication, respectively.

 In case of SASL based authentication provide the `username` and `password`.
 
 For AWS MSK IAM authentication provide `aws_msk_iam` as `sasl`. You don't need to set `username` and `password` in this case. However, you need to enable TLS by setting `tls` to `enable`.

**Credential based authentication:**

**SASL:**

- `sasl` - Kafka SASL auth mode. (Values: `plaintext`, `scram_sha256`, `scram_sha512`, `gssapi`, `aws_msk_iam` or `none`, Default: `none`, Optional)
- `username` - Username used for sasl authentication. (Required if `sasl` is not `none` or `aws_msk_iam`)
- `password` - Password used for sasl authentication. (Required if `sasl` is not `none` or `aws_msk_iam`)


**TLS:**

- `tls` - To enable SSL auth for Kafka, set this to `enable`. If not set, TLS for Kafka is not used. (Values: `enable`, `disable`, Default: `disable`, Optional)
- `ca` - Certificate authority file for TLS client authentication. (Optional)
- `cert` - Certificate for client authentication. (Optional)
- `key` - Key for client authentication. (Optional)
- `keyPassword` - If set the `keyPassword` is used to decrypt the provided `key`. (Optional)


**AWS MSK IAM Specific Configuration:**

- `awsRegion` - AWS region of your MSK cluster. (Optional, required for AWS MSK IAM authentication)

For authentication, you can also use `TriggerAuthentication` CRD to configure the authenticate by providing `awsAccessKeyID` and `awsSecretAccessKey` or `awsRoleArn`.

**Role based authentication:**

- `awsRoleArn` - Amazon Resource Names (ARNs) uniquely identify AWS resource.

**Credential based authentication:**

- `awsAccessKeyID` - Id of the user.
- `awsSecretAccessKey` - Access key for the user to authenticate with.


### New Consumers and Offset Reset Policy

When a new Kafka consumer is created, it must determine its consumer group initial position, i.e. the offset it will start to read from. The position is decided in Kafka consumers via a parameter `auto.offset.reset` and the possible values to set are `latest` (Kafka default), and `earliest`. This parameter in KEDA should be set accordingly. In this initial status, no offset has been committed to Kafka for the consumer group and any request for offset metadata will return an `INVALID_OFFSET`; so KEDA has to manage the consumer pod's autoscaling in relation to the offset reset policy that has been specified in the parameters:

- If the policy is set to `earliest` (a new consumer wants to replay everything in the topic from its beginning) and no offset is committed, the scaler will return a lag value equal to the last offset in the topic. In the case of a new topic the last offset will be 0, so it will scale the deployment to 0 replicas. If a new message is produced to the topic, KEDA will return the new value of the offset (1), and will scale the deployments to consume the message.
- If the policy is set to `latest` (so the new consumer will only consume new messages) and no offset is committed, the scaler will return a negative lag value, and will also tell the HPA to remain `active`, hence the deployment should have the minimum number of replicas running. This is to allow the consumer to read any new message on the topic, and commit its offset.

### Example

#### Your kafka cluster has no SASL/TLS auth:

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

#### Your kafka cluster turns on SASL/TLS auth:

##### Method 1: `tls` and `sasl` are in TriggerAuthentication

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

##### Method 2: `tls` and `sasl` are in ScaledObject

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-kafka-secrets
  namespace: default
data:
  username: "admin"
  password: "admin"
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
  - parameter: username
    name: keda-kafka-secrets
    key: username
  - parameter: password
    name: keda-kafka-secrets
    key: password
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
      tls: enable
      sasl: plaintext
      # Optional
      lagThreshold: "50"
      offsetResetPolicy: latest
    authenticationRef:
      name: keda-trigger-auth-kafka-credential
```

#### Your AWS MSK has IAM auth:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-kafka-secrets
  namespace: default
data:
  sasl: "aws_msk_iam"
  tls: "enable"
  awsAccessKeyID: <your awsAccessKeyID>
  awsSecretAccessKey: <your awsSecretAccessKey>
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
  - parameter: tls
    name: keda-kafka-secrets
    key: tls
  - parameter: awsAccessKeyID
    name: keda-kafka-secrets
    key: awsAccessKeyID
  - parameter: awsSecretAccessKey
    name: keda-kafka-secrets
    key: awsSecretAccessKey
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
  - type: apache-kafka
    metadata:
      bootstrapServers: localhost:9092
      consumerGroup: my-group       # Make sure that this consumer group name is the same one as the one that is consuming topics
      topic: test-topic
      awsRegion: us-east-1         # AWS region of your MSK cluster
      # Optional
      lagThreshold: "50"
      offsetResetPolicy: latest
    authenticationRef:
      name: keda-trigger-auth-kafka-credential
```
