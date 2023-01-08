+++
title = "Use your own TLS Certificates"
description = "Guidance to use user given TLS certificates"
weight = 100
+++

KEDA uses self-signed certificates for different things. These certificates are generated and rotated by the operator, storing them in a Kubernetes secret (`kedaorg-certs`) that it's mounted in other KEDA components in the (default) path `/certs` using the names `tls.crt` and `tls.key` for TLS certificate and `ca.crt` and `ca.key` for CA certificate. KEDA also patches Kubernetes resources to include the `caBundle`, making Kubernetes to trust in the CA.

While this is a good starting point, some end-users may want to use their own certificates which are generated from their own CA in order to improve security. This can be done disabling the certificate generation/rotation in the operator and updating default values in other components (if required). 

As the operator is the responsible of generating the certificate for all the services, this behaviour can be disabled removing the console argument `--enable-cert-rotation=true` or setting it to `false`. Once this is disabled, user given certs can be placed in the secret `kedaorg-certs` which is automatically mounted in all the components or they can be patched to use other secret (this can be done throught helm values too).

All the components read the folder `/certs` looking for the certificates inside it, but this folder can be also modifyied using the console argument `--cert-dir`, patching the manifests or using helm values. Due to these certs are also used for internal communication between KEDA components, the CA certificate is also required for registering it as a trusted CA inside KEDA components.
