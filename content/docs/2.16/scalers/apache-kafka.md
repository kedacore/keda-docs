+++
title = "Apache Kafka"
availability = "v1.0+"
maintainer = "Microsoft"
category = "Messaging"
description = "Scale applications based on an Apache Kafka topic or other services that support Kafka protocol."
go_file = "kafka_scaler"
+++

> **Notice:**
> - By default, the number of replicas will not exceed:
>   - The number of partitions on a topic when a topic is specified;
>   - The number of partitions of *all topics* in the consumer group when no topic is specified;
>   - `maxReplicaCount` specified in `ScaledObject`/`ScaledJob`. If not specified, then the default value of `maxReplicaCount` is taken into account;
>   - The number of partitions with non-zero lag if `limitToPartitionsWithLag` is set to `true`
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
    activationLagThreshold: '3'
    offsetResetPolicy: latest
    allowIdleConsumers: false
    scaleToZeroOnInvalidOffset: false
    excludePersistentLag: false
    limitToPartitionsWithLag: false
    version: 1.0.0
    partitionLimitation: '1,2,10-20,31'
    sasl: plaintext
    tls: enable
    unsafeSsl: 'false'
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
- `limitToPartitionsWithLag` - When set to `true`, the number of replicas will not exceed the number of partitions having non-zero lag. `topic` must be speicied when this parameter is set to `true`. `allowIdleConsumers` cannot be `true` when this parameter is `true`. (Default: `false`, Optional)
- `version` - Version of your Kafka brokers. See [samara](https://github.com/Shopify/sarama) version (Default: `1.0.0`, Optional)
- `partitionLimitation` - Comma separated list of partition ids to scope the scaling on. Allowed patterns are "x,y" and/or ranges "x-y". If set, the calculation of the lag will only take these ids into account.  (Default: All partitions, Optional)
- `sasl` - Kafka SASL auth mode. (Values: `plaintext`, `scram_sha256`, `scram_sha512`, `gssapi`, `oauthbearer`, or `none`, Default: `none`, Optional). This parameter could also be specified in `sasl` in TriggerAuthentication
- `saslTokenProvider` - Kafka SASL token provider when `sasl` is `oauthbearer`. (Values: `bearer`, `aws_msk_iam`, Default: `bearer`, Optional). This parameter could also be specified in `saslTokenProvider` in TriggerAuthentication
- `tls` - To enable SSL auth for Kafka, set this to `enable`. If not set, TLS for Kafka is not used. (Values: `enable`, `disable`, Default: `disable`, Optional). This parameter could also be specified in `tls` in TriggerAuthentication
- `unsafeSsl` - Skip certificate validation when connecting over HTTPS. (Values: `true`, `false`, Default: `false`, Optional)
- `awsRegion` - AWS region of your MSK cluster. (Optional, required for AWS MSK IAM authentication)

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
>   In such case, KEDA could scale the consumer down to 0 when there is no lag and won't be able scale up due to the topic could not be auto discovered.
>
> Fix for such case:
>  - Set `minReplicaCount` > 0;
>  - or use multiple triggers where one supplies `topic` to ensure lag for that topic will always be detected;
### Authentication Parameters

 You can use `TriggerAuthentication` CRD to configure the authentication by providing `sasl`, `username` and `password`, in case your Kafka cluster has SASL authentication turned on.  If you are using SASL/GSSAPI, you will need to provide Kerberos user, password or keytab, realm and krb5.conf file. If you are using SASL/OAuthbearer you will need to provide `oauthTokenEndpointUri` and `scopes` as required by your OAuth2 provider. You can also add custom SASL extension for OAuthbearer (see [KIP-342](https://cwiki.apache.org/confluence/display/KAFKA/KIP-342%3A+Add+support+for+Custom+SASL+extensions+in+OAuthBearer+authentication)) using `oauthExtensions`.
 If TLS is required you should set `tls` to `enable`. If required for your Kafka configuration, you may also provide a `ca`, `cert`, `key` and `keyPassword`. `cert` and `key` must be specified together.
 Another alternative is to specify `tls` and `sasl` in ScaledObject instead of `tls` and `sasl` in TriggerAuthentication, respectively. For AWS MSK IAM authentication, you only need to set `awsRegion` in ScaledObject and you also need to enable TLS by setting `tls` to enable.


**Credential based authentication:**

**SASL:**

- `sasl` - Kafka SASL auth mode. (Values: `plaintext`, `scram_sha256`, `scram_sha512`, `gssapi`, `oauthbearer` or `none`, Default: `none`, Optional)
- `saslTokenProvider` - Kafka SASL token provider. (Values: `bearer`, `aws_msk_iam`, Default: `bearer`, Optional).
- `username` - Username used for sasl authentication. (Optional)
- `password` - Password used for sasl authentication. (Optional)
- `keytab` - Kerberos keytab.  Either `password` or `keytab` is required in case of `gssapi`.  (Optional)
- `realm` - Kerberos realm.  (Optional unless sasl mode is `gssapi`)
- `kerberosConfig` - Kerberos configuration file. (Optional unless sasl mode is `gssapi`)
- `kerberosServiceName` - Kerberos service name. (Optional takes default value of `kafka` if not provided)
- `oauthTokenEndpointUri` - The OAuth Access Token URI used for oauthbearer token requests. (Optional unless sasl mode set to oauthbearer)
- `scopes` - A comma separated lists of OAuth scopes used in the oauthbearer token requests. (Optional)
- `oauthExtensions` - A comma separated lists of key value pairs in the format key=value OAuth extensions used in the oauthbearer token. (Optional)

**TLS:**

- `tls` - To enable SSL auth for Kafka, set this to `enable`. If not set, TLS for Kafka is not used. (Values: `enable`, `disable`, Default: `disable`, Optional)
- `ca` - Certificate authority file for TLS client authentication. (Optional)
- `cert` - Certificate for client authentication. (Optional)
- `key` - Key for client authentication. (Optional)
- `keyPassword` - If set the `keyPassword` is used to decrypt the provided `key`. (Optional)

**AWS MSK IAM Specific Configuration:**

For authentication, you must use `TriggerAuthentication` CRD to configure the authenticate by providing `awsAccessKeyID` and `awsSecretAccessKey` or `awsRoleArn` or a pod identity configuration.

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

#### Your kafka cluster turns on SASL OAuthbearer/TLS auth:

##### Method 1: `tls` and `sasl` are in TriggerAuthentication

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-kafka-secrets
  namespace: default
data:
  sasl: "oauthbearer"
  username: "admin"
  password: "admin"
  oauthTokenEndpointUri: "https://tokenendpoint.com/token"
  scopes: "default"
  oauthExtensions: "extension_logicalCluster=1,extension_identityPoolId=2"
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
  - parameter: oauthTokenEndpointUri
    name: keda-kafka-secrets
    key: oauthTokenEndpointUri
  - parameter: scopes
    name: keda-kafka-secrets
    key: scopes
  - parameter: oauthExtensions
    name: keda-kafka-secrets
    key: oauthExtensions
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
  oauthTokenEndpointUri: "https://tokenendpoint.com/token"
  scopes: "default"
  oauthExtensions: "extension_logicalCluster=1,extension_identityPoolId=2"
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
  - parameter: oauthTokenEndpointUri
    name: keda-kafka-secrets
    key: oauthTokenEndpointUri
  - parameter: scopes
    name: keda-kafka-secrets
    key: scopes
  - parameter: oauthExtensions
    name: keda-kafka-secrets
    key: oauthExtensions
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
      sasl: oauthbearer
      # Optional
      lagThreshold: "50"
      offsetResetPolicy: latest
    authenticationRef:
      name: keda-trigger-auth-kafka-credential
```

#### Your kafka cluster turns on SASL/GSSAPI auth without TLS:

##### `sasl/gssapi` in manager.yaml

If you use YAML declarations to deploy KEDA, add below volume mount and volume to supply writable location for required GSSAPI configurations for the `keda-operator` container.

```
          volumeMounts:
          - mountPath: /tmp/kerberos
            name: temp-kerberos-vol
            readOnly: false

      volumes:
      - name: temp-kerberos-vol
        emptyDir:
          medium: Memory
```

##### `sasl/gssapi` in keda-charts

If you use Helm Charts to deploy KEDA, add below volume mount and volume to supply writable location for required gssapi configurations.

```
volumes.keda.extraVolumeMounts
- mountPath: /tmp/kerberos
  name: temp-kerberos-vol
  readOnly: false

volumes.keda.extraVolumes
- name: temp-kerberos-vol
  emptyDir:
    medium: Memory
```

##### `sasl/gssapi` in TriggerAuthentication

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-kafka-secrets
  namespace: default
data:
  sasl: "gssapi"
  tls: "disable"
  username: "admin"
  realm: <your kerberos realm>
  keytab: <your kerberos keytab>
  kerberosConfig: <your kerberos configuration>
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
  - parameter: username
    name: keda-kafka-secrets
    key: username
  - parameter: realm
    name: keda-kafka-secrets
    key: realm
  - parameter: keytab
    name: keda-kafka-secrets
    key: keytab
  - parameter: kerberosConfig
    name: keda-kafka-secrets
    key: kerberosConfig
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

#### Your AWS MSK has IAM auth:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-kafka-secrets
  namespace: default
data:
  sasl: "oauthbearer"
  saslTokenProvider: "aws_msk_iam"
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
  - parameter: saslTokenProvider
    name: keda-kafka-secrets
    key: saslTokenProvider
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
