+++
title = "AWS SQS Queue"
layout = "scaler"
availability = "v1.0+"
maintainer = "Community"
description = "Scale applications based on AWS SQS Queue."
go_file = "aws_sqs_queue_scaler"
+++

### Trigger Specification

This specification describes the `aws-sqs-queue` trigger that scales based on an AWS SQS Queue.

```yaml
triggers:
- type: aws-sqs-queue
  metadata:
    # Required: queueURL
    queueURL: https://sqs.eu-west-1.amazonaws.com/account_id/QueueName
    queueLength: "5"  # Default: "5"
    # Required: awsRegion
    awsRegion: "eu-west-1"
    identityOwner: pod | operator # Optional. Default: pod
```

**Parameter list:**

- `queueURL` - Full URL for the SQS Queue
- `queueLength` - Target value for queue length passed to the scaler. Example: if one pod can handle 10 messages, set the queue length target to 10. If the actual messages in the SQS Queue is 30, the scaler scales to 3 pods. (default: 5)

> For the purposes of scaling, "actual messages" is equal to `ApproximateNumberOfMessages` + `ApproximateNumberOfMessagesNotVislble`, since `NotVisible` in SQS terms means the message is still in-flight/processing.

- `awsRegion` - AWS Region for the SQS Queue
- `identityOwner` - Receive permissions on the SQS Queue via Pod Identity or from the KEDA operator itself (see below).

> When `identityOwner` set to `operator` - the only requirement is that the Keda operator has the correct IAM permissions on the SQS queue. Additional Authentication Parameters are not required.

### Authentication Parameters

> These parameters are relevant only when `identityOwner` is set to `pod`.

You can use `TriggerAuthentication` CRD to configure the authenticate by providing either a role ARN or a set of IAM credentials.

**Pod identity based authentication:**

- `podIdentity.provider` needs to be set to either `aws-kiam` or `aws-eks` on the `TriggerAuthentication` and the pod/service account must be configured correctly for your pod identity provider.

**Role based authentication:**

- `awsRoleArn` - Amazon Resource Names (ARNs) uniquely identify AWS resource

**Credential based authentication:**

- `awsAccessKeyID` - Id of the user
- `awsSecretAccessKey` - Access key for the user to authenticate with

The user will need access to read properties from the specified AWS SQS queue.

### Example

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: test-secrets
data:
  AWS_ACCESS_KEY_ID: <encoded-user-id>
  AWS_SECRET_ACCESS_KEY: <encoded-key>
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
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: aws-sqs-queue-scaledobject
  namespace: keda-test
spec:
  scaleTargetRef:
    name: nginx-deployment
  triggers:
  - type: aws-sqs-queue
    authenticationRef:
      name: keda-trigger-auth-aws-credentials
    metadata:
      queueURL: myQueue
      queueLength: "5"
      awsRegion: "eu-west-1"
```
