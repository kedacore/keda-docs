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
    authenticationRef: 
      name: keda-trigger-auth-aws-role
    metadata:
      # Required: queueURL
      queueURL: myQueue
      queueLength: "5"  # Default: "5"
      # Required: awsRegion
      awsRegion: "eu-west-1" 
```

### Authentication Parameters

You can use `TriggerAuthentication` CRD to configure the authenticate by providing either a role ARN or a set of IAM credentials.

**Role based authentication:**

- `awsRoleArn` - Amazon Resource Names (ARNs) uniquely identify AWS resource

**Credential based authentication:**

- `awsAccessKeyID` - Id of the user
- `awsSecretAccessKey` - Access key for the user to authenticate with

The user will need access to read data from AWS Cloudwatch.

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
  authenticationRef:
    name: keda-trigger-auth-aws-credentials
  triggers:
  - type: aws-sqs-queue
    metadata:
      queueURL: myQueue
      queueLength: "5"
      awsRegion: "eu-west-1" 
```