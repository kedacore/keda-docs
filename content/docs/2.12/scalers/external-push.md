+++
title = "External Push"
availability = "v2.0+"
maintainer = "Microsoft"
description = "Scale applications based on an external push scaler."
go_file = "external_scaler"
+++

### Trigger Specification

This specification describes the `external-push` trigger for an external push scaler.

```yaml
triggers:
- type: external-push
  metadata:
    scalerAddress: external-scaler-service:8080
    caCert : /path/to/tls/ca.pem
    tlsCertFile: /path/to/tls/cert.pem # Deprecated. https://github.com/kedacore/keda/issues/4549
    tlsClientCert: /path/to/tls/cert.pem
    tlsClientKey: /path/to/tls/key.pem
    unsafeSsl: false
```

**Parameter list:**

- `scalerAddress` - Address of the external push scaler implementing `ExternalScaler.StreamIsActive` in externalscaler.proto. Format must be `host:port`.
- `caCert` - Location of a Certificate Authority (CA) certificate to use for the GRPC connection to authenticate with. (Optional)
- `tlsClientCert` - Location of a client certificate to use for the GRPC connection to authenticate with. (Optional)
- `tlsClientKey` - Location of a client private key to use for the GRPC connection to authenticate with. (Optional)
- `unsafeSsl` - Skip certificate validation when connecting over HTTPS. (Values: `true`, `false`, Default: `false`, Optional)

The entire metadata object is passed to the external scaler in `ScaledObjectRef.scalerMetadata`.

> For implementing an external scaler, refer to [External Scalers Concept](../concepts/external-scalers.md).

### Authentication Parameters

Not supported.

### Example

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: name
  namespace: namespace
spec:
  scaleTargetRef:
    name: keda-node
  triggers:
  - type: external-push
    metadata:
      scalerAddress: external-scaler-service:8080
      caCert : /path/to/tls/ca.pem
      tlsClientCert: /path/to/tls/cert.pem
      tlsClientKey: /path/to/tls/key.pem
      unsafeSsl: false
```
