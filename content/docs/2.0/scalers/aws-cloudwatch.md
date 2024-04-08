+++
title = "AWS CloudWatch"
availability = "v1.0+"
maintainer = "Community"
description = "Scale applications based on AWS CloudWatch."
go_file = "aws_cloudwatch_scaler"
+++

### Trigger Specification

This specification describes the `aws-cloudwatch` trigger that scales based on a AWS CloudWatch.

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
    awsAccessKeyIDFromEnv: AWS_ACCESS_KEY_ID # default AWS_ACCESS_KEY_ID
    # Optional: AWS Secret Access Key, can use TriggerAuthentication as well
    awsSecretAccessKeyFromEnv: AWS_SECRET_ACCESS_KEY # default AWS_SECRET_ACCESS_KEY
    identityOwner: pod | operator # Optional. Default: pod
```

**Parameter list:**

- `identityOwner` - Receive permissions on the CloudWatch via Pod Identity or from the KEDA operator itself (see below). (Values: `pod`, `operator`, Default: `pod`, Optional)

> When `identityOwner` set to `operator` - the only requirement is that the KEDA operator has the correct IAM permissions on the CloudWatch. Additional Authentication Parameters are not required.

### Authentication Parameters

> These parameters are relevant only when `identityOwner` is set to `pod`.

You can use `TriggerAuthentication` CRD to configure the authenticate by providing either a role ARN or a set of IAM credentials.

**Pod identity based authentication:**

- `podIdentity.provider` - Needs to be set to either `aws-kiam` or `aws-eks` on the `TriggerAuthentication` and the pod/service account must be configured correctly for your pod identity provider.

**Role based authentication:**

- `awsRoleArn` - Amazon Resource Names (ARNs) uniquely identify AWS resource.

**Credential based authentication:**

- `awsAccessKeyID` - Id of the user.
- `awsSecretAccessKey` - Access key for the user to authenticate with.

The user will need access to read data from AWS CloudWatch.

### IAM Permissions

The user or role used to authenticate with AWS CloudWatch must have the `cloudwatch:GetMetricData` permissions. The following is an example IAM policy that grants the necessary permissions to read data from CloudWatch:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudWatchGetMetricData",
      "Effect": "Allow",
      "Action": "cloudwatch:GetMetricData",
      "Resource": "*"
    }
  ]
}
```

This can be further scoped to specific namespaces, by using the `cloudwatch:namespace` condition key. For example, to only allow access to the `AWS/EC2` metric namespace:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudWatchGetMetricData",
      "Effect": "Allow",
      "Action": "cloudwatch:GetMetricData",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "cloudwatch:namespace": "AWS/EC2"
        }
      }
    }
  ]
}
```

For more information, see the [AWS CloudWatch IAM documentation](https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazoncloudwatch.html).

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
    name: keda-aws-secrets        # Required.
    key: AWS_ACCESS_KEY_ID        # Required.
  - parameter: awsSecretAccessKey # Required.
    name: keda-aws-secrets        # Required.
    key: AWS_SECRET_ACCESS_KEY    # Required.
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: aws-cloudwatch-queue-scaledobject
  namespace: keda-test
spec:
  scaleTargetRef:
    name: nginx-deployment
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
