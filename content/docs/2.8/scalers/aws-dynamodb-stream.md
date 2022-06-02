+++
title = "AWS DynamoDB Streams"
availability = "v2.8+"
maintainer = "Community"
description = "Scale applications based on AWS DynamoDB Streams"
layout = "scaler"
go_file = "aws_dynamodb_stream_scaler"
+++

### Trigger Specification

This specification describes the `aws-dynamodb-stream` trigger that scales based on the shard count of AWS DynamoDB Streams.

```yaml
triggers:
- type: aws-dynamodb-stream
  metadata:
    # Required: awsRegion
    awsRegion: "ap-northeast-1"
    # Required: tableName
    tableName: myTableName
    # Optional targetValue
    shardCount: "2"
    # Optional. Default: pod
    identityOwner: pod | operator 
```

**Parameter list:**

- `awsRegion` - AWS Region for the DynamoDB.
- `tableName` - The target DynamoDB table to which the stream belongs.
- `shardCount` - The target value that a DynamoDB streams consumer can handle. (Default: `2`, Optional)
- `identityOwner` - Receive permissions on the DynamoDB and DynamoDB Streams via Pod Identity or from the KEDA operator itself (see below). (Values: `pod`, `operator`, Default: `pod`, Optional)

> When `identityOwner` set to `operator` - the only requirement is that the KEDA operator has the correct IAM permissions on the DynamoDB and Dynamodb Streams. Additional Authentication Parameters are not required.

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
- `awsSessionToken` - Session token, only required when using [temporary credentials](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_use-resources.html).

The user will need access to read properties from the specified AWS DynamoDB and DynamoDB Streams.

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
  name:  aws-dynamodb-stream-scaledobject
  namespace: keda-test
spec:
  scaleTargetRef:
    name: nginx-deployment
  triggers:
  - type: aws-dynamodb-stream
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
  name:  aws-dynamodb-stream-scaledobject
  namespace: keda-test
spec:
  scaleTargetRef:
    name: nginx-deployment
  triggers:
  - type: aws-dynamodb-stream
    authenticationRef:
      name: keda-trigger-auth-aws-credentials
    metadata:
      awsRegion: ap-northeast-1
      tableName: keda-events
      shardCount: "2"
```
