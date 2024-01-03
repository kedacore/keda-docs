+++
title = "EKS Pod Identity Webhook for AWS"
+++

[**EKS Pod Identity Webhook**](https://github.com/aws/amazon-eks-pod-identity-webhook), which is described more in depth [here](https://aws.amazon.com/blogs/opensource/introducing-fine-grained-iam-roles-service-accounts/), allows you to provide the role name using an annotation on a service account associated with your pod.

> ⚠️ **WARNING:** [`aws-eks` auth has been deprecated](https://github.com/kedacore/keda/discussions/5343) and support for it will be removed from KEDA on v3. We strongly encourage the migration to [`aws` auth](./aws.md).

You can tell KEDA to use EKS Pod Identity Webhook via `podIdentity.provider`.

```yaml
podIdentity:
  provider: aws-eks # Optional. Default: none
```
