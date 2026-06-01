+++
title = "AWS DynamoDB"
availability = "v2.7+"
maintainer = "Community"
category = "Data & Storage"
description = "Scale applications based on the records count in AWS DynamoDB"
go_file = "aws_dynamodb_scaler"
+++

### Trigger Specification

This specification describes the AWS DynamoDB scaler. This scaler uses a specified DynamoDB query to determine if and when to scale a given workload.

```yaml
triggers:
- type: aws-dynamodb
  metadata:
    # Required: awsRegion
    awsRegion: "eu-west-1"
    # Optional: awsEndpoint
    awsEndpoint: ""
    # Required: tableName
    tableName: myTableName
    # Optional: indexName
    indexName: ""
    # Required: targetValue
    targetValue: "1"
    # Required: expressionAttributeNames
    expressionAttributeNames: '{ "#k" : "partition_key_name"}'
    # Required: keyConditionExpression
    keyConditionExpression: "#k = :key"
    # Required: expressionAttributeValues
    expressionAttributeValues: '{ ":key" : {"S":"partition_key_target_value"}, ":filterValue" : {"S" : "hello world"}}'
    # Optional: filterExpression
    filterExpression: 'filterField = :filterValue'
    # DEPRECATED: This parameter is deprecated as of KEDA v2.13 and will be removed in v3. Optional # Optional. Default: pod
    identityOwner: pod | operator
```

**Parameter list:**

- `awsRegion` - AWS Region for the DynamoDB Table.
- `awsEndpoint` - Endpoint URL to override the default AWS endpoint. (Default: `""`, Optional)
- `tableName` - The target table where the scaler execute the query.
- `indexName` - The index used by the DynamoDB Query. (Optional)
- `targetValue` - The target value for the number of items retrieved by the query.
- `activationTargetValue` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)
- `expressionAttributeNames` - one or more substitution tokens for attribute names in an expression. Defined as JSON.
- `keyConditionExpression` - the condition that specifies the key values for items to be retrieved by the Query action.
- `expressionAttributeValues` - one or more values that can be substituted in an expression. Defined as JSON.
- `filterExpression` - the condition that specifies the filterExpression to be used by the Query action.
- `identityOwner` - Receive permissions on the DynamoDB Table via Pod Identity or from the KEDA operator itself (see below). (DEPRECATED: This parameter is deprecated as of KEDA v2.13 and will be removed in version `3`, Values: `pod`, `operator`, Default: `pod`, Optional, This field only applies for `aws-eks` authentication)

> When `identityOwner` set to `operator` - the only requirement is that the KEDA operator has the correct IAM permissions on the DynamoDB Table. Additional Authentication Parameters are not required.

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

The user will need access to read properties from the specified AWS SQS queue.

### Example

#### Scaling a deployment using IAM Role


```yaml
apiVersion: v1
kind: Secret
metadata:
  name: test-secrets
data:
  AWS_ROLE_ARN: <encoded-iam-role-arn>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-aws-credentials
  namespace: default
spec:
  secretTargetRef:
  - parameter: awsRoleArn    # The property in KEDA.
    name: test-secrets       # The name of the kubernetes secret.
    key: AWS_ROLE_ARN        # The key from the kubernetes secret.
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name:  aws-dynamodb-table-scaledobject
  namespace: keda-test
spec:
  scaleTargetRef:
    name: nginx-deployment
  triggers:
  - type: aws-dynamodb
    authenticationRef:
      name: keda-trigger-auth-aws-credentials
    metadata:
      awsRegion: eu-west-2
      tableName: keda-events
      expressionAttributeNames: '{ "#k" : "event_type"}'
      keyConditionExpression: "#k = :key"
      expressionAttributeValues: '{ ":key" : {"S":"scaling_event"}}'
      targetValue: "5"
```


#### Scaling a deployment using IAM Users

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
  namespace: default
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
  name:  aws-dynamodb-table-scaledobject
  namespace: keda-test
spec:
  scaleTargetRef:
    name: nginx-deployment
  triggers:
  - type: aws-dynamodb
    authenticationRef:
      name: keda-trigger-auth-aws-credentials
    metadata:
      awsRegion: eu-west-2
      tableName: keda-events
      expressionAttributeNames: '{ "#k" : "event_type"}'
      keyConditionExpression: "#k = :key"
      expressionAttributeValues: '{ ":key" : {"S":"scaling_event"}}'
      targetValue: "5"
```
