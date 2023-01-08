+++
title = "Admission Webhooks"
description = "Admission webhooks configurations guidance"
weight = 100
+++

By default, the admission webhooks are registered with `failurePolicy: Ignore`, this won't block the resources creation/update when the admission controller is not available. To ensure that the validation is always required and perform validation, setting `failurePolicy` to `Fail` is required.
