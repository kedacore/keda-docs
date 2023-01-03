+++
title = "Validating Webhook"
description = "Details on KEDA Validating Webhook"
weight = 100
+++

## Validating Webhooks

Webhooks require a valid certificates to expose the server for the api-server. To achieve this KEDA generates it's own certificates and stores them in a secret. This solves the problem but some users could want to have their own certificates generated from their own CA in order to improve the security. This can be doable disabling the certificate rotation via setting the console argument `disable-cert-rotation=true` and placing the `tls.crt` and `tls.key` files (these names are required by the framework and can't be changed) in the path `/certs`. The path is also configurable using the console argument `webhooks-cert-dir=PATH-FOR-CERTS`.

As default, the validating webhook is registered with `failurePolicy: Ignore`, this won't block the resources creation/update if the webhook isn't available. To ensure that the validation is always required, rejecting incoming ScaledObjects when the webhook isn't available, `failurePolicy: Fail` is required.

### ScaledObject

The KEDA registers a validating webhook for checking every incoming ScaledObject to ensure that them don't autoscale a workload already autoscaled by other sources (other ScaledObject or HPA), giving a message exlaining the conflict.
This won't block self updates autoscaling the same workload.
