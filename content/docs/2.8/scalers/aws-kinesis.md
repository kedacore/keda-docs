+++
title = "AWS Kinesis Stream"
availability = "v1.1+"
maintainer = "Community"
description = "Scale applications based on AWS Kinesis Stream."
go_file = "aws_kinesis_stream_scaler"
+++

### Trigger Specification

This specification describes the `aws-kinesis-stream` trigger that scales based on the shard count of AWS Kinesis Stream.

```yaml
triggers:
- type: aws-kinesis-stream
  metadata:
    # Required
    streamName: myKinesisStream
    # Required
    awsRegion: "eu-west-1"
    # Optional: Default: 2
    shardCount: "2"
    identityOwner: pod | operator # Optional. Default: pod
```

**Parameter list:**

- `streamName` - Name of AWS Kinesis Stream.
- `shardCount` - The target value that a Kinesis data streams consumer can handle. (Default: `2`, Optional)
- `activationShardCount` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)
- `awsRegion` - AWS Region for the Kinesis Stream.
- `identityOwner` - Receive permissions on the Kinesis Stream via Pod Identity or from the KEDA operator itself (see below). (Values: `pod`, `operator`, Default: `pod`, Optional)

> When `identityOwner` set to `operator` - the only requirement is that the KEDA operator has the correct IAM permissions on the Kinesis Stream. Additional Authentication Parameters are not required.

### Authentication Parameters

> These parameters are relevant only when `identityOwner` is set to `pod`.

You can use `TriggerAuthentication` CRD to configure the authenticate by providing either a role ARN or a set of IAM credentials, or use other [KEDA supported authentication methods](https://keda.sh/concepts/authentication).

#### Delegate auth with TriggerAuthentication

**Role based authentication:**

- `awsRoleArn` - Amazon Resource Names (ARNs) uniquely identify AWS resource.

**Credential based authentication:**

- `awsAccessKeyID` - Id of the user.
- `awsSecretAccessKey` - Access key for the user to authenticate with.
- `awsSessionToken` - Session token, only required when using [temporary credentials](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_use-resources.html).

The user will need `DescribeStreamSummary` IAM permission policy to read data from AWS Kinesis Streams.

### Example

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: test-secrets
  namespace: keda-test
data:
  AWS_ACCESS_KEY_ID: <encoded-user-id> # Required.
  AWS_SECRET_ACCESS_KEY: <encoded-key> # Required.
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
  name: aws-kinesis-stream-scaledobject
  namespace: keda-test
spec:
  scaleTargetRef:
    name: nginx-deployment
  triggers:
    - type: aws-kinesis-stream
      authenticationRef:
        name: keda-trigger-auth-aws-credentials
      metadata:
        # Required
        streamName: myKinesisStream
        # Required
        awsRegion: "eu-west-1"
        # Optional: Default: 2
        shardCount: "2"
```
