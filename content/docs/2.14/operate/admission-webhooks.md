+++
title = "Admission Webhooks"
description = "Admission webhooks configurations guidance"
weight = 100
+++

## Validation Enforcement

By default, the admission webhooks are registered with `failurePolicy: Ignore`, this won't block the resources creation/update when the admission controller is not available. To ensure that the validation is always required and perform validation, setting `failurePolicy` to `Fail` is required.

In addition, the admission webhooks can be skipped completely by setting the annotation `validations.keda.sh/hpa-ownership` on HPA objects to "false". Be cautious when doing so as it exposes the system to potential risks.
