+++
fragment = "content"
weight = 100
title = "AWS Kinesis Stream"
background = "light"
+++

Scale applications based on AWS Kinesis Stream.

**Availability:** v1.1+ | **Maintainer:** Community

<!--more-->

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
```

**Parameter list:**

- `streamName` - Name of AWS Kinesis Stream
- `shardCount` - The target value that a Kinesis data streams consumer can handle.
- `awsRegion` - AWS Region for the Kinesis Stream

### Authentication Parameters

You can use `TriggerAuthentication` CRD to configure the authenticate by providing either a role ARN or a set of IAM credentials, or use other [KEDA supported authentication methods](https://keda.sh/concepts/authentication).

#### Delegate auth with TriggerAuthentication

**Role based authentication:**

- `awsRoleArn` - Amazon Resource Names (ARNs) uniquely identify AWS resource

**Credential based authentication:**

- `awsAccessKeyID` - Id of the user
- `awsSecretAccessKey` - Access key for the user to authenticate with

The user will need `DescribeStreamSummary` IAM permission policy to read data from AWS Kinesis Streams.

### Example

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: test-secrets
  namespace: keda-test
data:
  AWS_ACCESS_KEY_ID: <user-id>
  AWS_SECRET_ACCESS_KEY: <key>
--- 
apiVersion: keda.k8s.io/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-aws-credentials
  namespace: keda-test
spec:
  secretTargetRef:
  - parameter: awsAccessKeyID     # Required.
    name: keda-aws-secrets        # Required.
    key: AWS_ACCESS_KEY_ID        # Required.
  - parameter: awsSecretAccessKey # Required.
    name: keda-aws-secrets        # Required.
    key: AWS_SECRET_ACCESS_KEY    # Required.
---
apiVersion: keda.k8s.io/v1alpha1
kind: ScaledObject
metadata:
  name: aws-kinesis-stream-scaledobject
  namespace: keda-test
  labels:
    test: nginx-deployment
spec:
  scaleTargetRef:
    deploymentName: nginx-deployment
  triggers:
    - type: aws-kinesis-stream
      authenticationRef:
        name: keda-trigger-auth-aws-credential
      metadata:
        # Required
        streamName: myKinesisStream
        # Required
        awsRegion: "eu-west-1"
        # Optional: Default: 2
        shardCount: "2"
```