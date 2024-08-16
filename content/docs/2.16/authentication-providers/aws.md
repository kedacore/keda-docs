+++
title = "AWS (IRSA) Pod Identity Webhook"
+++

[**AWS IAM Roles for Service Accounts (IRSA) Pod Identity Webhook**](https://github.com/aws/amazon-eks-pod-identity-webhook) ([documentation](https://aws.amazon.com/blogs/opensource/introducing-fine-grained-iam-roles-service-accounts/)) allows you to provide the role name using an annotation on a service account associated with your pod.

You can tell KEDA to use AWS Pod Identity Webhook via `podIdentity.provider`.

```yaml
podIdentity:
  provider: aws
  roleArn: <role-arn> # Optional. 
  identityOwner: keda|workload # Optional. If not set, 'keda' is default value. Mutually exclusive with 'roleArn' (if set)
```

**Parameter list:**

- `roleArn` - Role ARN to be used by KEDA. If not set the IAM role which the KEDA operator uses will be used. Mutually exclusive with `identityOwner: workload`
- `identityOwner` - Owner of the identity to be used. (Values: `keda`, `workload`, Default: `keda`, Optional)

> ⚠️ **NOTE:** `podIdentity.roleArn` and `podIdentity.identityOwner` are mutually exclusive, setting both is not supported.

## How to use 

AWS IRSA will give access to pods with service accounts having appropriate annotations. ([official docs](https://aws.amazon.com/es/blogs/opensource/introducing-fine-grained-iam-roles-service-accounts/)) You can set these annotations on the KEDA Operator service account.

This can be done for you during deployment with Helm with the following flags: 

1. `--set podIdentity.aws.irsa.enabled=true`
2. `--set podIdentity.aws.irsa.roleArn={aws-arn-role}`

You can override the default KEDA operator IAM role by specifying an `roleArn` parameter under the `podIdentity` field. This allows end-users to use different roles to access various resources which allows for more granular access than having a single IAM role that has access to multiple resources.

If you would like to use the same IAM credentials as your workload is currently using, `podIdentity.identityOwner` can be set with the value `workload` and KEDA will inspect the workload service account to check if IRSA annotation is there and KEDA will assume that role.

## AssumeRole or AssumeRoleWithWebIdentity?

This authentication automatically uses both, falling back from [AssumeRoleWithWebIdentity](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithWebIdentity.html) to [AssumeRole](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html) if the first one fails. This extends the capabilities because KEDA doesn't need `sts:AssumeRole` permission if you are already working with [WebIdentities](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_oidc.html); in this case, you can add a KEDA service account to the trusted relations of the role.

## Setting up KEDA role and policy

The [official AWS docs](https://aws.amazon.com/es/blogs/opensource/introducing-fine-grained-iam-roles-service-accounts/) explain how to set up a basic configuration for an IRSA role. The policy changes depending on if you are using the KEDA role (`podIdentity.roleArn` is not set) or workload role (`podIdentity.roleArn` sets a RoleArn or `podIdentity.identityOwner` sets to `workload`).

### Using KEDA role to access infrastructure

Attach the desired policies to KEDA's role, granting the access permissions that you want to provide. For example, this could be a policy to use with SQS:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "sqs:GetQueueAttributes",
            "Resource": "arn:aws:sqs:*:YOUR_ACCOUNT:YOUR_QUEUE"
        }
    ]
}
```

### Using KEDA role to assume workload role using AssumeRoleWithWebIdentity
In this case, KEDA will use its own (k8s) service account to assume workload role (and to use workload's role attached policies). This scenario requires that KEDA service account is trusted for requesting the role using AssumeRoleWithWebIdentity.

This is an example of how role policy could look like:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            ... YOUR WORKLOAD TRUSTED RELATION ...
        },
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "YOUR_OIDC_ARN"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "YOUR_OIDC:sub": "system:serviceaccount:keda:keda-operator",
                    "YOUR_OIDC:aud": "sts.amazonaws.com"
                }
            }
        }
    ]
}
```

### Using KEDA role to assume workload role using AssumeRole

In this case, KEDA will use its own role to assume the workload role (and to use workload's role attached policies). This scenario is a bit more complex because we need to establish a trusted relationship between both roles and we need to grant to KEDA's role the permission to assume other roles.

This is an example of how KEDA's role policy could look like:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": [
        "arn:aws:iam::ACCOUNT_1:role/ROLE_NAME"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": [
        "arn:aws:iam::ACCOUNT_2:role/*"
      ]
    }
  ]
}
```
This can be extended so that KEDA can assume multiple workload roles, either as an explicit array of role ARNs, or with a wildcard.
This policy attached to KEDA's role will allow KEDA to assume other roles, now you have to allow the workload roles you want to use all allow to being assumed by the KEDA operator role. To achieve this, you have to add a trusted relation to the workload role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      // Your already existing relations
      "Sid": "",
      "Effect": "Allow",
      // ...
    },
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT:role/KEDA_ROLE_NAME"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```
