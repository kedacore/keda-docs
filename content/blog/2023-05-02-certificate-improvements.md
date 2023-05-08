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

KEDA is a component that runs on kubernetes, receiving request from kubernetes API server (from the HPA Controller) but also integrates with multiple external sources (upstreams). 

To improve our integration with Kubernetes' API server, we decided to skip the certificate validation using a built-in property, `insecureSkipTLSVerify`. Thanks to it, we could use self generate the metrics server certificate on every restart, not having to manage it and simplifying the process, but using at least an encrypted channel between kubernetes and KEDA metrics server.

The second case was more complicated... We really trust in the encryption as the way to achieve secure connections, so we wanted to support encrypted connection wherever a user wants to use them, but using self-signed certificates is a really common scenario and that was complex to manage. As a first and fast option, we decided to support an extra parameter in some scalers to skip the certificate validation, allowing these scenarios.

Before version 2.9, KEDA was composed by 2 different components with totally different goals, the operator and the metrics server. As both components were independent by design, so we didn't need to secure anything between them, but it changed in version v2.9. [As we announced in KEDA v2.9 release](/blog/releases/2.9.0), we introduced an important change in the architecture. Now we have 2 components, but they are strong related and they need to have a secured channel for the internal communications. At that point, we decided to release v2.9 with this gap in terms of encryption for internal communications, but having the commitment of solving this for the next version.

## Securing connections between KEDA components and Kubernetes API server

As part of version 2.10, we have released a mechanism to generate a self-signed certificate that will be used to encrypt all the traffic between various KEDA components but also patching `apiservice` and the new validating webhook to include the `caBundle`. Thanks to this mechanism, we can encrypt all the traffic between KEDA components with mutual TLS (TLSv1.3). Additionally, it allows us to remove the `insecureSkipTLSVerify` flag for the Kubernetes API Server making all our communications more secure between Kubernetes and KEDA.

By default, KEDA uses self-signed certificates for various things and the operator is in charge of generating and rotating them. Certificates are stored in a Kubernetes secret (`kedaorg-certs`) that is mounted to all KEDA components to `/certs`. Generated files are named `tls.crt` and `tls.key` for TLS certificate and `ca.crt` and `ca.key` for CA certificate. KEDA also patches Kubernetes resources to include the `caBundle`, making Kubernetes to trust in the CA.

While this is a good starting point, some end-users may want to use their own certificates which are generated from their own CA in order to improve security. This can be done by disabling the certificate generation/rotation in the operator and updating default values in other components (if required). 

The KEDA operator is responsible for generating certificates for all the services, this behaviour can be disabled removing the console argument `--enable-cert-rotation=true` or setting it to `false`. Once this setting is disabled, end-user specific certificates can be stored in the `kedaorg-certs` secret and will automatically update all components (this can be done through helm values too).

All components inspect the folder `/certs` for any certificates inside it. Argument `--cert-dir` can be used to specify another folder to be used as a source for certificates, this argument can be patched in the manifests or using Helm values.

## Register your own CA in KEDA Operator Trusted Store

With our recent architecture changes in v2.9, our operator is the only component that needs to interact with the (scaler) dependencies. This has been the last requirement for solving the problem of registering CAs to avoid the usage of `unsafeSsl` because even though it works, it also allows any certificate, which is not totally secure.

To overcome this problem, KEDA supports registering custom CAs that will be used by various SDKs where possible. To register custom CAs, you need to ensure that the certs are in `/custom/ca` folder and KEDA will try to register as trusted CAs all certificates inside this folder.

## A practical example using helm

With KEDA, we strive to make application autoscaling simple and that is why we have integrated cert-manager manifests as an optional component of our Helm chart. By doing so, you can use cert-manager to generate, rotate and patch services as part of the Helm installation (cert manager needs to be installed up front).

```yaml
certificates:
  autoGenerated: false # disables the cert-generation by the operator
  certManager:
    enabled: true # enables the certificate generation using cert manager
    generateCA: true # uses a self-signed generated CA
    # caSecretName: "kedaorg-ca"
```

To provide a CA to be used for generating certificates, you can store it as a secret (in the same namespace where KEDA is installed) and configure the secret. This will register an issuer based on it for generating the certificates.

```yaml
certificates:
  autoGenerated: false # disables the cert-generation by the operator
  certManager:
    enabled: true # enables the certificate generation using cert manager
    generateCA: false # uses a self-signed generated CA
    caSecretName: "kedaorg-ca" # secret name where the CA is stored
```

> Note: As KEDA requires the services to be correctly patched, when the cert manager integration is enabled, the manifests are annotated. If you provide a CA via secret, the secret has to be annotated with `cert-manager.io/allow-direct-injection: "true"`. Otherwise, the cert manager cannot patch the resources with the CA.

## Conclusion

The improvements made to certificate management in KEDA 2.10 are a significant step forward in enhancing security and reliability, but they are not the only ones. We are working to make KEDA even more secure by default with small actions like limiting the default minimum TLS version or correctly using security contexts in Kubernetes.

If you want to dive deeper, don't hesitate to check the [repo changelog](https://github.com/kedacore/keda/blob/main/CHANGELOG.md), where every change is listed. And stay tuned to future posts about other security tips! ;)