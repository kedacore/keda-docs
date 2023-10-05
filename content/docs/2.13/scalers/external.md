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
  name: external-scaledobject
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

Here is an example of external scaler with certificates

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: certificate
data:
  ca.crt: "YOUR_CA_IN_SECRET"
  tls.crt: "YOUR_CERTIFICATE_IN_SECRET"
  tls.key: "YOUR_KEY_IN_SECRET"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth
spec:
  secretTargetRef:
  - parameter: caCert
    name: certificate
    key: ca.crt
  - parameter: tlsClientCert
    name: certificate
    key: tls.crt
  - parameter: tlsClientKey
    name: certificate
    key: tls.key
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: external-scaledobject
spec:
  scaleTargetRef:
    name: keda-redis-node
  triggers:
  - type: external
    metadata:
      scalerAddress: redis-external-scaler-service:8080
      metricType: mymetric
      scalerAddress: mydomain.com:443
      extraKey: "demo"
    authenticationRef:
      name: keda-trigger-auth
```