+++
title = "Admission Webhook"
description = "Automatically validate resource changes to prevent misconfiguration and enforce best practices"
weight = 100
+++

## Admission Webhooks

Admission webhooks require a valid certificate to expose the server for the api-server. To achieve this KEDA generates its own certificates and stores them in a secret. 

While this is a good starting point, some end-users may want to use their own certificates which are generated from their own CA in order to improve security. This can be achieved by disabling the certificate rotation via setting the console argument `disable-cert-rotation=true` and mounting the `tls.crt` and `tls.key` files to `/certs`. The path is also configurable using the console argument `webhooks-cert-dir=PATH-FOR-CERTS`.

By default, the admission webhooks are registered with `failurePolicy: Ignore`, this won't block the resources creation/update when the admission controller is not available. To ensure that the validation is always required and perform validation, setting `failurePolicy` to `Fail` is required.

### ScaledObject

KEDA will block all incoming changes to `ScaledObject` to ensure that they do not autoscale a workload that is already being autoscaled by another other sources (other ScaledObject or HPA).
