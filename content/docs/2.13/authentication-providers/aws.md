+++
title = "Pod Identity Webhook for AWS"
+++

[**AWS IRSA Pod Identity Webhook**](https://github.com/aws/amazon-eks-pod-identity-webhook), which is described more in depth [here](https://aws.amazon.com/blogs/opensource/introducing-fine-grained-iam-roles-service-accounts/), allows you to provide the role name using an annotation on a service account associated with your pod.

You can tell KEDA to use AWS Pod Identity Webhook via `podIdentity.provider`.

```yaml
podIdentity:
  provider: aws # Optional. Default: none
  roleArn: <role-arn|workload> # Optional. Default: RoleArn from annotation on service-account.
```

AWS IRSA will give access to pods with service accounts having appropriate annotations. Refer
to these [docs](https://aws.amazon.com/es/blogs/opensource/introducing-fine-grained-iam-roles-service-accounts/) for more information. You can set these annotations on the KEDA Operator service account. This can be done for you during deployment with Helm with the following flags: 

1. `--set podIdentity.aws.irsa.enabled=true`
2. `--set podIdentity.aws.irsa.roleArn={aws-arn-role}`

You can override the role that was assigned to KEDA during installation, by specifying an `roleArn` parameter under the `podIdentity` field. This allows end-users to use different roles to access various resources which is more secure than using a single identity that has access to multiple resources. 
To reduce the managing overhead, `podIdentity.roleArn` can be set with the value `workload` and KEDA will check the workload service account to check if IRSA annotation is there and KEDA will assume that role.

## Setting up KEDA role and policy

How to do a basic configuration of IRSA role [is explained in official docs](https://aws.amazon.com/es/blogs/opensource/introducing-fine-grained-iam-roles-service-accounts/) but the policy changes depending if you are using KEDA role (`podIdentity.roleArn` is not set) or workload role (`podIdentity.roleArn` sets a RoleArn or `workload`).

### Using KEDA role to access infrastructure

This is the easiest case and you just need to attach to KEDA's role the desired policy/policies, granting the access permissions that you want to provide.


### Using KEDA role to assume workload role

In this case, KEDA will use its own role to assume the workload role (and to use workload's role attached policies). This scenario is a bit more complex because we need to establish a trusted relationship between both roles and we need to grant to KEDA's role the permission to assume other roles.

This is how KEDA's role policy could look:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": [
        "arn:aws:iam::ACCOUNT:role/ROLE_NAME"
      ]
    }
  ]
}
```

This policy attached to KEDA's role will allow KEDA to assume other roles, now you have to allow other roles to being assumed by KEDA's role. To achieve this, you have to add a trusted relation to the workload role:

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