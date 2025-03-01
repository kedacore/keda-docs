+++
title = "Security"
description = "Guidance to configure security options"
weight = 100
+++

## Use your own TLS Certificates

KEDA uses self-signed certificates for different things. These certificates are generated and rotated by the operator. Certificates are stored in a Kubernetes secret (`kedaorg-certs`) that it's mounted to all KEDA components in the (default) path `/certs`. Generated files are named `tls.crt` and `tls.key` for TLS certificate and `ca.crt` and `ca.key` for CA certificate. KEDA also patches Kubernetes resources to include the `caBundle`, making Kubernetes to trust in the CA.

The KEDA operator is responsible for generating certificates for all the services, certificates are by default generated for following DNS names:
```
<KEDA_OPERATOR_SERVICE>                          -> eg. keda-operator
<KEDA_OPERATOR_SERVICE>.svc                      -> eg. keda-operator.svc
<KEDA_OPERATOR_SERVICE>.svc.<CLUSTER_DOMAIN>     -> eg. keda-operator.svc.cluster.local
```
To change the default cluster domain (`cluster.local`), parameter `--k8s-cluster-domain="my-domain"` on KEDA operator can be used. Helm Charts set this automatically from `clusterDomain` value.

While this is a good starting point, some end-users may want to use their own certificates which are generated from their own CA in order to improve security. This can be done by disabling the certificate generation/rotation in the operator and updating default values in other components (if required). 

Certificates generation in the KEDA operator can be disabled by removing the console argument `--enable-cert-rotation=true` or setting it to `false`. Once this setting is disabled, user given certs can be placed in the secret `kedaorg-certs` which is automatically mounted in all the components or they can be patched to use other secret (this can be done throughout helm values too).

Additionally, KEDA includes a new `--enable-webhook-patching` flag, which controls whether the operator patches webhook resources. By default, this is set to `true`, ensuring Kubernetes trusts the operator's CA. However, if webhooks are disabled or not needed in your deployment, you can set this flag to `false` to avoid errors related to missing webhook resources.

Example use case:
- When using operator-managed certificates but disabling webhooks, set `--enable-webhook-patching=false` to prevent the operator from attempting to patch non-existent webhook resources.

All components inspect the folder `/certs` for any certificates inside it. Argument `--cert-dir` can be used to specify another folder to be used as a source for certificates, this argument can be patched in the manifests or using Helm values. Because these certificates are also used for internal communication between KEDA components, the CA is also required to be registered as a trusted CA inside KEDA components.

## Register your own CA in KEDA Operator Trusted Store

There are use cases where we need to use self-signed CAs (cases like AWS where their CA isn't registered as trusted etc.). Some scalers allow skipping the cert validation by setting the `unsafeSsl` parameter, but this isn't ideal because it allows any certificate, which is not secure.

To overcome this problem, KEDA supports registering custom CAs to be used by SDKs where it is possible. To register custom CAs, place the certificates in a directory, then pass the directory to the KEDA operator using the `--ca-dir=` flag. By default, the KEDA operator looks in the `/custom/ca` directory.  Multiple directories can be specified by providing the `--ca-dir=` flag multiple times. KEDA will try to register as trusted CAs all certificates inside these directories. If using kustomize or helm, CA certificate directories can be specified via `certificates.operator.caDirs` and certificate volumes can be mounted using `volumes.keda.extraVolumes` and `volumes.keda.extraVolumeMounts`.
