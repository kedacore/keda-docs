+++
title = "AWS DynamoDB Streams"
availability = "v2.8+"
maintainer = "Community"
category = "Data & Storage"
description = "Scale applications based on AWS DynamoDB Streams"
go_file = "aws_dynamodb_streams_scaler"
+++

### Trigger Specification

This specification describes the `aws-dynamodb-streams` trigger that scales based on the shard count of AWS DynamoDB Streams.

```yaml
triggers:
- type: aws-dynamodb-streams
  metadata:
    # Required: awsRegion
    awsRegion: "ap-northeast-1"
    # Optional: awsEndpoint
    awsEndpoint: ""
    # Required: tableName
    tableName: myTableName
    # Optional targetValue
    shardCount: "2"
    # DEPRECATED: This parameter is deprecated as of KEDA v2.13 and will be removed in v3. Optional # Optional. Default: pod
    identityOwner: pod | operator
```

**Parameter list:**

- `awsRegion` - AWS Region for the DynamoDB.
- `awsEndpoint` - Endpoint URL to override the default AWS endpoint. (Default: `""`, Optional)
- `tableName` - The target DynamoDB table to which the stream belongs.
- `shardCount` - The target value that a DynamoDB streams consumer can handle. (Default: `2`, Optional)
- `activationShardCount` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)
- `identityOwner` - Receive permissions on the DynamoDB and DynamoDB Streams via Pod Identity or from the KEDA operator itself (see below). (DEPRECATED: This parameter is deprecated as of KEDA v2.13 and will be removed in version `3`, Values: `pod`, `operator`, Default: `pod`, Optional, This field only applies for `aws-eks` authentication)

> When `identityOwner` set to `operator` - the only requirement is that the KEDA operator has the correct IAM permissions on the DynamoDB and Dynamodb Streams. Additional Authentication Parameters are not required.

### Authentication Parameters

You can use `TriggerAuthentication` CRD to configure the authenticate by providing either a role ARN or a set of IAM credentials.

**Pod identity based authentication:**

- `podIdentity.provider` - Needs to be set on the `TriggerAuthentication` and the pod/service account must be configured correctly for your pod identity provider.

**Role based authentication:**

- `awsRoleArn` - Amazon Resource Names (ARNs) uniquely identify AWS resource. (This field is deprecated and only applies for `aws-eks` authentication, for `aws` is set in the auth)

**Credential based authentication:**

- `awsAccessKeyID` - Id of the user.
- `awsSecretAccessKey` - Access key for the user to authenticate with.
- `awsSessionToken` - Session token, only required when using [temporary credentials](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_use-resources.html).

The user will need access to read properties from the specified AWS DynamoDB and DynamoDB Streams.

### Scaling on consumer lag

This scaler scales on the number of open shards only. It does not scale on backlog, such as the number of records waiting or how far behind a consumer is, because DynamoDB Streams does not expose that information without consuming the stream:

- DynamoDB Streams has no consumer groups or service-side checkpoints. Each consumer tracks its own progress (for example in a KCL lease table, or inside Lambda), so KEDA cannot read it in a generic way.
- `DescribeStream` returns only the starting sequence number for open shards. Finding the latest record would require `GetRecords`, which competes with your consumers for the per-shard read limits (AWS recommends no more than two readers per shard) and adds read cost.
- Sequence numbers are not contiguous, so the difference between two of them is not a record count.

Shard count comes from a cheap management call with no side effects on the stream.

To scale on backlog, have the consumer publish its own lag metric to CloudWatch or Prometheus, and add an [`aws-cloudwatch`](./aws-cloudwatch.md) or [`prometheus`](./prometheus.md) trigger next to this one in the same `ScaledObject`. A simple lag metric is the age of the latest record the consumer has processed, that is, the current time minus the record's `ApproximateCreationDateTime`. When a `ScaledObject` has several triggers, the HPA uses the one that asks for the most replicas. The shard count therefore acts as a floor, the lag metric scales above it, and `maxReplicaCount` caps the total. See [Combining shard count with a consumer lag metric](#combining-shard-count-with-a-consumer-lag-metric) for an example.

### Example

#### Scaling a deployment using IAM Role


```yaml
apiVersion: v1
kind: Secret
metadata:
  name: test-secrets
  namespace: keda-test
data:
  AWS_ROLE_ARN: <encoded-iam-role-arn>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-aws-credentials
  namespace: keda-test
spec:
  secretTargetRef:
  - parameter: awsRoleArn    # The property in KEDA.
    name: test-secrets       # The name of the kubernetes secret.
    key: AWS_ROLE_ARN        # The key from the kubernetes secret.
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name:  aws-dynamodb-streams-scaledobject
  namespace: keda-test
spec:
  scaleTargetRef:
    name: nginx-deployment
  triggers:
  - type: aws-dynamodb-streams
    authenticationRef:
      name: keda-trigger-auth-aws-credentials
    metadata:
      awsRegion: ap-northeast-1
      tableName: keda-events
      shardCount: "2"
```


#### Scaling a deployment using IAM Users

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: test-secrets
  namespace: keda-test
data:
  AWS_ACCESS_KEY_ID: <encoded-user-id>       # Required.
  AWS_SECRET_ACCESS_KEY: <encoded-key>       # Required.
  AWS_SESSION_TOKEN: <encoded-session-token> # Required when using temporary credentials.
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-aws-credentials
  namespace: keda-test
spec:
  secretTargetRef:
  - parameter: awsAccessKeyID     # Required.
    name: test-secrets            # Required.
    key: AWS_ACCESS_KEY_ID        # Required.
  - parameter: awsSecretAccessKey # Required.
    name: test-secrets            # Required.
    key: AWS_SECRET_ACCESS_KEY    # Required.
  - parameter: awsSessionToken    # Required when using temporary credentials.
    name: test-secrets            # Required when using temporary credentials.
    key: AWS_SESSION_TOKEN        # Required when using temporary credentials.
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name:  aws-dynamodb-streams-scaledobject
  namespace: keda-test
spec:
  scaleTargetRef:
    name: nginx-deployment
  triggers:
  - type: aws-dynamodb-streams
    authenticationRef:
      name: keda-trigger-auth-aws-credentials
    metadata:
      awsRegion: ap-northeast-1
      tableName: keda-events
      shardCount: "2"
```

#### Combining shard count with a consumer lag metric

In this example, the consumer publishes a `ConsumerLagSeconds` metric to CloudWatch, in a custom namespace, with a `TableName` dimension. The `aws-dynamodb-streams` trigger keeps one replica for every two open shards, and the `aws-cloudwatch` trigger adds replicas when the lag rises above 30 seconds. The `TriggerAuthentication` is the one from the examples above. The IAM identity also needs `cloudwatch:GetMetricData` for the second trigger.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name:  aws-dynamodb-streams-scaledobject
  namespace: keda-test
spec:
  scaleTargetRef:
    name: nginx-deployment
  minReplicaCount: 1
  maxReplicaCount: 10                 # Upper limit across both triggers.
  triggers:
  # Floor: one replica for every two open shards.
  - type: aws-dynamodb-streams
    authenticationRef:
      name: keda-trigger-auth-aws-credentials
    metadata:
      awsRegion: ap-northeast-1
      tableName: keda-events
      shardCount: "2"
  # Scales above the floor when the consumer falls behind.
  - type: aws-cloudwatch
    authenticationRef:
      name: keda-trigger-auth-aws-credentials
    metadata:
      awsRegion: ap-northeast-1
      namespace: MyApp/StreamConsumer  # Custom namespace the consumer publishes to.
      metricName: ConsumerLagSeconds
      dimensionName: TableName
      dimensionValue: keda-events
      metricStat: Maximum
      metricStatPeriod: "60"
      metricCollectionTime: "180"
      targetMetricValue: "30"
      minMetricValue: "0"
```
