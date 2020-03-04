+++
fragment = "content"
weight = 100
title = "AWS Cloudwatch"
background = "light"
+++

Scale applications based on a AWS Cloudwatch.

**Availability:** v1.0+ | **Maintainer:** Community

<!--more-->

### Trigger Specification

This specification describes the `aws-cloudwatch` trigger that scales based on a AWS Cloudatch.

```yaml
triggers:
  - type: aws-cloudwatch
    metadata:
      # Required: namespace
      namespace: AWS/SQS
      # Required: Dimension Name
      dimensionName: QueueName
      dimensionValue: keda
      metricName: ApproximateNumberOfMessagesVisible
      targetMetricValue: "2"
      minMetricValue: "0"
      # Required: region
      awsRegion: "eu-west-1"
      # Optional: AWS Access Key ID, can use TriggerAuthentication as well
      awsAccessKeyID: AWS_ACCESS_KEY_ID # default AWS_ACCESS_KEY_ID
      # Optional: AWS Secret Access Key, can use TriggerAuthentication as well
      awsSecretAccessKey: AWS_SECRET_ACCESS_KEY # default AWS_SECRET_ACCESS_KEY
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
  name: aws-cloudwatch-queue-scaledobject
  namespace: keda-test
  labels:
    test: nginx-deployment
spec:
  scaleTargetRef:
    deploymentName: nginx-deployment
  triggers:
  - type: aws-cloudwatch
    metadata:
      namespace: AWS/SQS
      dimensionName: QueueName
      dimensionValue: keda
      metricName: ApproximateNumberOfMessagesVisible
      targetMetricValue: "2"
      minMetricValue: "0"
      awsRegion: "eu-west-1"
    authenticationRef:
      name: keda-trigger-auth-aws-credentials
```