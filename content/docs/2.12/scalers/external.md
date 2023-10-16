+++
title = "External"
availability = "v1.0+"
maintainer = "Microsoft"
description = "Scale applications based on an external scaler."
go_file = "external_scaler"
+++

### Trigger Specification

This specification describes the `external` trigger for an external scaler.

```yaml
triggers:
- type: external
  metadata:
    scalerAddress: external-scaler-service:8080
    caCert : /path/to/tls/ca.pem
    tlsCertFile: /path/to/tls/cert.pem # Deprecated. https://github.com/kedacore/keda/issues/4549
    tlsClientCert: /path/to/tls/cert.pem
    tlsClientKey: /path/to/tls/key.pem
    unsafeSsl: false
```

**Parameter list:**

- `scalerAddress` - Address of the external scaler. Format must be `host:port`.
- `tlsCertFile` - Location of a certificate to use for the GRPC connection to authenticate with. (Optional)
- `unsafeSsl` - Skip certificate validation when connecting over HTTPS. (Values: `true`, `false`, Default: `false`, Optional)

The entire metadata object is passed to the external scaler in `ScaledObjectRef.scalerMetadata`.

> For implementing an external scaler, refer to [External Scalers Concept](../concepts/external-scalers.md).

### Authentication Parameters

- `caCert` - Certificate Authority (CA) certificate to use for the GRPC connection to authenticate with. (Optional)
- `tlsClientCert` - Client certificate to use for the GRPC connection to authenticate with. (Optional)
- `tlsClientKey` - Client private key to use for the GRPC connection to authenticate with. (Optional)

### Example

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: redis-scaledobject
  namespace: keda-redis-test
spec:
  scaleTargetRef:
    name: keda-redis-node
  triggers:
  - type: external
    metadata:
      scalerAddress: redis-external-scaler-service:8080
      address: REDIS_HOST
      password: REDIS_PASSWORD
      listName: mylist
      listLength: "5"
```
