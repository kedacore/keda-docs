+++
fragment = "content"
weight = 100
title = "AWS SQS Queue"
background = "light"
+++

Scale applications based on AWS SQS Queue.

**Availability:** v1.0+ | **Maintainer:** Community

<!--more-->

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
```
**Parameter list:**

- `queueURL` - Full URL for the SQS Queue
- `queueLength` - Target value for `ApproximateNumberOfMessages` in the SQS Queue
- `awsRegion` - AWS Region for the SQS Queue

### Authentication Parameters

You can use `TriggerAuthentication` CRD to configure the authenticate by providing either a role ARN or a set of IAM credentials.

**Pod identity based authentication:**

- `podIdentity.provider` needs to bet set on the `TriggerAuthentication` to either `kiam` or `eks` and the pod/service account must be configured correctly for your pod identity provider.

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
  name: aws-sqs-queue-scaledobject
  namespace: keda-test
  labels:
    deploymentName: nginx-deployment
    test: nginx-deployment
spec:
  scaleTargetRef:
    deploymentName: nginx-deployment
  triggers:
  - type: aws-sqs-queue
    authenticationRef:
      name: keda-trigger-auth-aws-credentials
    metadata:
      queueURL: myQueue
      queueLength: "5"
      awsRegion: "eu-west-1" 
```