+++
title = "Configure TLS"
description = "TLS termination, certificates, cipher suites, and SNI configuration for the interceptor proxy"
+++

> **Note:** This page has not been fully verified against the current implementation.
> Configuration values, environment variable names, or default values may be inaccurate or incomplete.
> If you find an issue, please [open a GitHub issue](https://github.com/kedacore/keda-docs/issues/new) or submit a pull request.

The interceptor can terminate TLS for incoming connections.
All TLS settings are configured via Helm values and environment variables.

## Enable TLS termination

Enable TLS on the interceptor proxy:

```shell
helm upgrade http-add-on kedacore/keda-add-ons-http \
  --namespace keda \
  --set interceptor.tls.enabled=true \
  --set interceptor.tls.certSecret=<your-tls-secret>
```

The interceptor loads TLS certificates from a Kubernetes Secret mounted at `/certs`.
The Secret must contain `tls.crt` and `tls.key` entries.

## TLS settings

| Helm value                         | Env var                                 | Default                        | Description                                                              |
| ---------------------------------- | --------------------------------------- | ------------------------------ | ------------------------------------------------------------------------ |
| `interceptor.tls.enabled`          | `KEDA_HTTP_PROXY_TLS_ENABLED`           | `false`                        | Enable TLS on the proxy.                                                 |
| `interceptor.tls.port`             | `KEDA_HTTP_PROXY_TLS_PORT`              | `8443`                         | Port the TLS proxy listens on.                                           |
| `interceptor.tls.certSecret`       | —                                       | `keda-tls-certs`               | Name of the Kubernetes Secret containing the TLS certificate and key.    |
| `interceptor.tls.certPath`         | `KEDA_HTTP_PROXY_TLS_CERT_PATH`         | `/certs/tls.crt`               | Path to the certificate file.                                            |
| `interceptor.tls.keyPath`          | `KEDA_HTTP_PROXY_TLS_KEY_PATH`          | `/certs/tls.key`               | Path to the private key file.                                            |
| `interceptor.tls.minVersion`       | `KEDA_HTTP_PROXY_TLS_MIN_VERSION`       | Go default (TLS 1.2)           | Minimum TLS version (`"1.2"` or `"1.3"`).                                |
| `interceptor.tls.maxVersion`       | `KEDA_HTTP_PROXY_TLS_MAX_VERSION`       | Go default (highest supported) | Maximum TLS version (`"1.2"` or `"1.3"`).                                |
| `interceptor.tls.cipherSuites`     | `KEDA_HTTP_PROXY_TLS_CIPHER_SUITES`     | Go defaults                    | Comma-separated list of cipher suite names.                              |
| `interceptor.tls.curvePreferences` | `KEDA_HTTP_PROXY_TLS_CURVE_PREFERENCES` | Go defaults                    | Comma-separated list of elliptic curve names (e.g., `X25519,CurveP256`). |
| `interceptor.tls.skipVerify`       | `KEDA_HTTP_PROXY_TLS_SKIP_VERIFY`       | `false`                        | Skip TLS verification for upstream (backend) connections.                |

## SNI-based certificate selection

The interceptor supports SNI-based certificate selection when multiple certificate/key pairs are loaded via the `KEDA_HTTP_PROXY_TLS_CERT_STORE_PATHS` environment variable.
Set this to a comma-separated list of paths containing additional certificate/key pairs.

## What's Next

- [Environment Variables Reference](../../reference/environment-variables/) — all TLS-related environment variables.
