+++
title = "Validating Webhook"
description = "Details on KEDA Validating Webhook"
weight = 100
+++

## Validating Webhooks

### ScaledObject

The KEDA registers a validating webhook for checking every incoming ScaledObject to ensure that them don't autoscale a workload already autoscaled by other sources (other ScaledObject or HPA), giving a message exlaining the conflict.
This won't block self updates autoscaling the same workload.

As default, the validating webhook is registered with `failurePolicy: Ignore`, this won't block the ScaledObject creation/update if the webhook isn't available. To ensure that the validation is always required, rejecting incoming ScaledObjects when the webhook isn't available, `failurePolicy: Fail` is required.
