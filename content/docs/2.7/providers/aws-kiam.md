+++
title = "Kiam Pod Identity for AWS"
layout = "provider"
weight = 4
+++

[**Kiam**](https://github.com/uswitch/kiam/) lets you bind an AWS IAM Role to a pod using an annotation on the pod.

You can tell KEDA to use Kiam via `podIdentity.provider`.

```yaml
podIdentity:
  provider: aws-kiam # Optional. Default: none
```
