+++
title = "Securing autoscaling with the newly improved certificate management in KEDA 2.10"
date = 2023-05-02
author = "Jorge Turrado (SCRM Lidl International Hub)"
aliases = [
"/blog/exploring-new-certificate-management"
]
+++

Recently, we have release KEDA v2.10 that introduced a key improvement for managing certificates and your autoscaling security: 

- Encryption of any communication between KEDA components.
- Support for providing your own certificates for internal communications.
- Support for using customs certificate authorities (CA).

With these new improvements, we can dramatically improve the security between KEDA components, the Kubernetes API server and scaler sources. Let's take a closer look.

## Where do we come from?

KEDA is a component that runs on kubernetes, receiving request from kubernetes API server (from the HPA Controller) but also calling to multiple external sources (upstreams). 

For the first thing, we decided to skip the certificate validation using a built-in property, `insecureSkipTLSVerify`. Thanks to it, we could use self generate the metrics server certificate on every restart, not having to manage it and simplifying the process, but using at least an encrypted channel between kubernetes and KEDA metrics server.

The second case was more complicated... We really trust in the encryption as the way to achieve secure connections, so we wanted to support encrypted connection wherever a user wants to use them, but using self-signed certificates is a really common scenario and that was complex to manage. As a first and fast option, we decided to support an extra parameter in some scalers to skip the certificate validation, allowing these scenarios.

Before version 2.9, KEDA was composed by 2 different components with totally different goals, the operator and the metrics server. As both components were independent by design, so we didn't need to secure anything between them, but it changed in version v2.9. [As we announced in KEDA v2.9 release](/blog/releases/2.9.0), we introduced an important change in the architecture. Now we have 2 components, but they are strong related and they need to have a secured channel for the internal communications. At that point, we decided to release v2.9 with this gap in terms of encryption for internal communications, but having the commitment of solving this for the next version.

## Securing connections between KEDA components and kubernetes API server

As part of version 2.10, we have released a mechanism to generate a self-signed certificate that will be used for encrypting all the traffic between KEDA components but also patching `apiservice` and the new validating webhook to include the `caBundle`. Thanks to this mechanism, we can encrypt all the traffic between KEDA components with mutual TLS in the latest version (TLSv1.3), but also allows removing the `insecureSkipTLSVerify` flag in the `apiservice`, making more secure all the communications between the cluster and KEDA.

As default, KEDA uses self-signed certificates for different things. These certificates are generated and rotated by the operator. Certificates are stored in a Kubernetes secret (`kedaorg-certs`) that it's mounted to all KEDA components in the (default) path `/certs`. Generated files are named `tls.crt` and `tls.key` for TLS certificate and `ca.crt` and `ca.key` for CA certificate. KEDA also patches Kubernetes resources to include the `caBundle`, making Kubernetes to trust in the CA.

While this is a good starting point, some end-users may want to use their own certificates which are generated from their own CA in order to improve security. This can be done by disabling the certificate generation/rotation in the operator and updating default values in other components (if required). 

The KEDA operator is responsible for generating certificates for all the services, this behaviour can be disabled removing the console argument `--enable-cert-rotation=true` or setting it to `false`. Once this setting is disabled, user given certs can be placed in the secret `kedaorg-certs` which is automatically mounted in all the components or they can be patched to use other secret (this can be done through helm values too).

All components inspect the folder `/certs` for any certificates inside it. Argument `--cert-dir` can be used to specify another folder to be used as a source for certificates, this argument can be patched in the manifests or using Helm values.

## Register your own CA in KEDA Operator Trusted Store

As part of the introduction I have explained that KEDA needs to query upstreams and sometimes it's complicated the certificate management and that's totally true, but thanks to the changes in the architecture described during the release v2.9, now the operator is the only componet that needs to interact with the upstreams. This has been the last requirement for solving the problem of registering CAs to avoid the usage of `unsafeSsl` because even though it works, it also allows any certificate, which is not totally secure.

To overcome this problem, KEDA supports registering custom CAs to be used by SDKs where it is possible. To register custom CAs, you need to ensure that the certs are in `/custom/ca` folder and KEDA will try to register as trusted CAs all certificates inside this folder.

## A practical example using helm

Most probably, the certificate management is part of the daily basic for a lot of people, but in KEDA we try to make the things simplest as possible, and that's why we have integrated cert manager manifests as an optional part of KEDA's helm chart. Thanks to that, using cert-manager for generating/rotating and patching the services is easiest as enabling some values during the helm installation (cert manager needs to be installed before).

```yaml
certificates:
  autoGenerated: false # disables the cert-generation by the operator
  certManager:
    enabled: true # enables the certificate generation using cert manager
    generateCA: true # uses a self-signed generated CA
    # caSecretName: "kedaorg-ca"
```

To provide a CA to be used for generating the certificates, you could save it as a secret (in the same namespace where KEDA is) and provide the secret. This will register an issuer based on it for generating the certificates.

```yaml
certificates:
  autoGenerated: false # disables the cert-generation by the operator
  certManager:
    enabled: true # enables the certificate generation using cert manager
    generateCA: false # uses a self-signed generated CA
    caSecretName: "kedaorg-ca" # secret name where the CA is stored
```

> Note: As KEDA needs that the services are correctly patched, when the cert manager integration is enabled the manifests are annotated for it. If you provide a CA via secret, the secret has to be annotated with `cert-manager.io/allow-direct-injection: "true"`. Otherwise cert manager won't be able to patch the resources with the CA.

## Conclusion

The improvements made to certificate management in KEDA 2.10 are a significant step forward in enhancing security and reliability, but they are not the only ones. We are working to make KEDA even more secure by default with small actions like limiting the default minimum TLS version or correctly using security contexts in Kubernetes.

If you want to dive deeper, don't hesitate to check the [repo changelog](https://github.com/kedacore/keda/blob/main/CHANGELOG.md), where every change is listed. And stay tuned to future posts about other security tips! ;)