+++
title = "Pod Identity Webhook for AWS by using IAM Roles for Service Accounts (IRSA)"
+++

[**AWS IAM Roles for Service Accounts (IRSA) Pod Identity Webhook**](https://github.com/aws/amazon-eks-pod-identity-webhook) ([details](https://aws.amazon.com/blogs/opensource/introducing-fine-grained-iam-roles-service-accounts/)) allows you to provide the role name using an annotation on a service account associated with your pod.

You can tell KEDA to use AWS Pod Identity Webhook via `podIdentity.provider`.

```yaml
podIdentity:
  provider: aws # Optional. Default: none
  roleArn: <role-arn|workload> # Optional. Default: RoleArn from annotation on service-account.
```

AWS IRSA will give access to pods with service accounts having appropriate annotations. ([official docs](https://aws.amazon.com/es/blogs/opensource/introducing-fine-grained-iam-roles-service-accounts/)) You can set these annotations on the KEDA Operator service account.

This can be done for you during deployment with Helm with the following flags: 

1. `--set podIdentity.aws.irsa.enabled=true`
2. `--set podIdentity.aws.irsa.roleArn={aws-arn-role}`

You can override the default KEDA operator IAM role by specifying an `roleArn` parameter under the `podIdentity` field. This allows end-users to use different roles to access various resources which allows for more granular access than having a single IAM role that has access to multiple resources.

If you would like to use the same IAM credentials as your workload is currently using, `podIdentity.roleArn` can be set with the value `workload` and KEDA will inspect the workload service account to check if IRSA annotation is there and KEDA will assume that role.

## Setting up KEDA role and policy

The [official AWS docs](https://aws.amazon.com/es/blogs/opensource/introducing-fine-grained-iam-roles-service-accounts/) explain how to set up a a basic configuration for an IRSA role. The policy changes depend if you are using the KEDA role (`podIdentity.roleArn` is not set) or workload role (`podIdentity.roleArn` sets a RoleArn or `workload`).

### Using KEDA role to access infrastructure

This is the easiest case and you just need to attach to KEDA's role the desired policy/policies, granting the access permissions that you want to provide.

### Using KEDA role to assume workload role

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

After these actions, you are ready to use KEDA's role to assume the workload role, providing it explictitly `podIdentity.roleArn: AWS_ROLE_AWS` or using the workload role (if the workload has IRSA enabled) `podIdentity.roleArn: workload`.