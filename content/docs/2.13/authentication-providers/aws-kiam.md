+++
title = "Kiam Pod Identity for AWS"
+++

[**Kiam**](https://github.com/uswitch/kiam/) lets you bind an AWS IAM Role to a pod using an annotation on the pod.

> ⚠️ **WARNING:** `aws-kiam` auth has been deprecated given [AWS KIAM is no longer maintained](https://github.com/uswitch/kiam/#-%EF%B8%8Fthis-project-is-now-being-abandoned-%EF%B8%8F-). As a result, [support for it will be removed from KEDA on v2.15](https://github.com/kedacore/keda/issues/5085). We strongly encourage the migration to [`aws` auth](./aws.md).

You can tell KEDA to use Kiam via `podIdentity.provider`.

```yaml
podIdentity:
  provider: aws-kiam # Optional. Default: none
```
