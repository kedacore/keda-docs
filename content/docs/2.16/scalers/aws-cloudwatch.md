+++
title = "AWS CloudWatch"
availability = "v1.0+"
maintainer = "Community"
category = "Metrics"
description = "Scale applications based on AWS CloudWatch."
go_file = "aws_cloudwatch_scaler"
+++

### Trigger Specification

This specification describes the `aws-cloudwatch` trigger that scales based on a AWS CloudWatch.

```yaml
triggers:
- type: aws-cloudwatch
  metadata:
    # Optional: namespace
    namespace: AWS/SQS
    # Optional: Dimension Name
    dimensionName: QueueName
    # Optional: Dimension Value
    dimensionValue: keda
    # Optional: Expression query
    expression: SELECT MAX("ApproximateNumberOfMessagesVisible") FROM "AWS/SQS" WHERE QueueName = 'keda'
    # Optional: metricName
    metricName: ApproximateNumberOfMessagesVisible
    targetMetricValue: "2.1"
    minMetricValue: "1.5"
    # Optional: ignoreNullValues
    ignoreNullValues: false
    # Required: region
    awsRegion: "eu-west-1"
    # Optional: AWS endpoint url
    awsEndpoint: ""
    # Optional: AWS Access Key ID, can use TriggerAuthentication as well
    awsAccessKeyIDFromEnv: AWS_ACCESS_KEY_ID # default AWS_ACCESS_KEY_ID
    # Optional: AWS Secret Access Key, can use TriggerAuthentication as well
    awsSecretAccessKeyFromEnv: AWS_SECRET_ACCESS_KEY # default AWS_SECRET_ACCESS_KEY
    # DEPRECATED: This parameter is deprecated as of KEDA v2.13 and will be removed in v3. Optional # Optional. Default: pod
    identityOwner: pod | operator
    # Optional: Collection Time
    metricCollectionTime: "300" # default 300
    # Optional: Metric Statistic
    metricStat: "Average" # default "Average"
    # Optional: Metric Statistic Period
    metricStatPeriod: "300" # default 300
    # Optional: Metric Unit
    metricUnit: "Count" # default ""
    # Optional: Metric EndTime Offset
    metricEndTimeOffset: "60" # default 0
```

**Parameter list:**

- `awsRegion` - AWS Region for the AWS Cloudwatch.
- `awsEndpoint` - Endpoint URL to override the default AWS endpoint. (Default: `""`, Optional)
- `namespace` - AWS Cloudwatch namespace where the metric is located (Optional, Required when `expression` is not specified)
- `metricName` - AWS Cloudwatch metric name (Optional, Required when `expression` is not specified)
- `dimensionName` - Supports specifying multiple dimension names by using ";" as a separator i.e. dimensionName: QueueName;QueueName (Optional, Required when `expression` is not specified)
- `dimensionValue` - Supports specifying multiple dimension values by using ";" as a separator i.e. dimensionValue: queue1;queue2 (Optional, Required when `expression` is not specified)
- `expression` - Supports query with [expression](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch-metrics-insights-querylanguage.html) (Optional, Required when `dimensionName` & `dimensionValue` are not specified)

- `identityOwner` - Receive permissions for CloudWatch via Pod Identity or from the KEDA operator itself (see below). (DEPRECATED: This parameter is deprecated as of KEDA v2.13 and will be removed in version `3`, Values: `pod`, `operator`, Default: `pod`, Optional, This field only applies for `aws-eks` authentication)

> When `identityOwner` set to `operator` - the only requirement is that the KEDA operator has the correct IAM permissions on the CloudWatch. Additional Authentication Parameters are not required.

- `metricCollectionTime` - How long in the past (seconds) should the scaler check AWS Cloudwatch. Used to define **StartTime** ([official documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_GetMetricData.html)). The value of `metricCollectionTime` must be greater than the `metricStatPeriod`, providing a value which is a multiple of the `metricStatPeriod` can improve performance on fetching data from Cloudwatch. In practice setting `metricCollectionTime` 2-to-3 times more than the `metricStatPeriod` value can make sure the scaler is able to get data points back from Cloudwatch, the scaler will always use the most up-to-date datapoint if more datapoints are returned. (Default: `300`, Optional)
- `metricStat` - Which statistics metric to be used by the query. Used to define **Stat** ([official documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html#Statistic)). (Default: `Average`, Optional)
- `metricStatPeriod` - Which frequency to be used by the related query. Used to define **Period**. The value cannot be an arbitrary number, it must be a value supported by Cloudwatch (1, 5, 10, 30, or a multiple of 60). More details can be found from ([official documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html#CloudWatchPeriods)). (Default: `300`, Optional)
- `metricUnit` - Which unit to be used by the query. Used to define **Unit** ([official documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html#Unit)). (Default: `none`, Optional)
- `metricEndTimeOffset` - How long in seconds to offset the **EndTime** ([official documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_GetMetricData.html)). Due to the eventual consistency model which is used by Cloudwatch, the latest datapoint one can get from Cloudwatch might not be accurate. The `metricEndTimeOffset` config provides a way to skip the most recent datapoint if needed. (Default: `0`, Optional)
- `minMetricValue`- Returned value in case of empty response from cloudwatch. (Default: 0, This value can be a float)
- `ignoreNullValues`- Describes the behaviour when the metric query returns no metric values in the response.  If set to `true`, the scaler will scale the workload based on the `minMetricValue` provided. If set to `false`, the scaler will return an error and not adjust the scale of the workload. When set to `false` this will take precedence over `minMetricValue`. (Default: `true`, Optional)

> Both `minMetricValue` and `ignoreNullValues` are used to handle the case when the metric query returns no metric values in the response from AWS CloudWatch. `minMetricValue` will scale the workload based on the value provided, while `ignoreNullValues`, if false, will return an error and not adjust the scale of the workload.

- `targetMetricValue`- Target value for the metric. (Default: 0, This value can be a float)
- `activationTargetMetricValue`- Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional, This value can be a float)

### Authentication Parameters

You can use `TriggerAuthentication` CRD to configure authentication by providing either a role ARN or a set of IAM credentials.

**Pod identity based authentication:**

- `podIdentity.provider` - Needs to be set the `TriggerAuthentication` and the pod/service account must be configured correctly for your pod identity provider.

**Role based authentication:**

- `awsRoleArn` - Amazon Resource Names (ARNs) uniquely identify AWS resource. (This field is deprecated and only applies for `aws-eks` authentication, for `aws` is set in the auth)

**Credential based authentication:**

- `awsAccessKeyID` - Id of the user.
- `awsSecretAccessKey` - Access key for the user to authenticate with.
- `awsSessionToken` - Session token, only required when using [temporary credentials](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_use-resources.html).

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
      targetMetricValue: "2.1"
      minMetricValue: "0"
      awsRegion: "eu-west-1"
    authenticationRef:
      name: keda-trigger-auth-aws-credentials
```
