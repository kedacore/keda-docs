+++
title = "AWS SQS Queue"
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
    # Required: queueURL or queueURLFromEnv. If both provided, uses queueURL
    queueURL: https://sqs.eu-west-1.amazonaws.com/account_id/QueueName
    queueURLFromEnv: QUEUE_URL # Optional. You can use this instead of `queueURL` parameter
    queueLength: "5"  # Default: "5"
    # Required: awsRegion
    awsRegion: "eu-west-1"
    # Optional: awsEndpoint
    awsEndpoint: ""
    identityOwner: pod | operator # Optional. Default: pod
    
```

**Parameter list:**

- `queueURL` - Full URL for the SQS Queue. The simple name of the queue can be used in case there's no ambiguity. (Optional, You can use this instead of `queueURLFromEnv` parameter)
- `queueURLFromEnv` - Name of the environment variable on the scale target to read the queue URL from. (Optional, You can use this instead of `queueURL` parameter)
- `queueLength` - Target value for queue length passed to the scaler. Example: if one pod can handle 10 messages, set the queue length target to 10. If the actual messages in the SQS Queue is 30, the scaler scales to 3 pods. (default: 5)
- `activationQueueLength` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)

> For the purposes of scaling, the default formula for "actual messages" is equal to `ApproximateNumberOfMessages` + `ApproximateNumberOfMessagesNotVisible`, since `NotVisible` in SQS terms means the message is still in-flight/processing. If you wish to only scale on `ApproximateNumberOfMessages` set `scaleOnInFlight` to `false`. You can also include the number of delayed messages when calculating "actual messages" by setting `scaleOnDelayed` to `true`. With `scaleOnInFlight` and `scaleOnDelayed` set to `true` the formula for "actual messages" is equal to `ApproximateNumberOfMessages` + `ApproximateNumberOfMessagesNotVisible` + `ApproximateNumberOfMessagesDelayed`.

- `scaleOnInFlight` - Indication of whether or not to include in-flight messages when calculating the number of SQS messages. (default: true, Optional)
- `scaleOnDelayed` - Indication of whether or not to include delayed messages when calculating the number of SQS messages. (default: false, Optional)
- `awsRegion` - AWS Region for the SQS Queue.
- `awsEndpoint` - Endpoint URL to override the default AWS endpoint. (Default: `""`, Optional)
- `identityOwner` - Receive permissions on the SQS Queue via Pod Identity or from the KEDA operator itself (see below). (Values: `pod`, `operator`, Default: `pod`, Optional)

> When `identityOwner` set to `operator` - the only requirement is that the KEDA operator has the correct IAM permissions on the SQS queue. Additional Authentication Parameters are not required.

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

The user will need access to read properties from the specified AWS SQS queue.

### Example

#### Scaling a deployment using podIdentity providers

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-aws-credentials
  namespace: keda-test
spec:
  podIdentity:
    provider: aws-kiam # or aws-eks when using IRSA
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

#### Scaling a deployment using IAM Role

When you need to specify the IAM Role used to access the sqs queue.

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

#### Scaling on ApproximateNumberOfMessages only
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
      scaleOnInFlight: false
```
