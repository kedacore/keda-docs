+++
title = "External Push"
layout = "scaler"
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
    tlsCertFile: /path/to/tls/cert.pem # optional
```

> For implementing an external scaler, refer to [External Scalers Concept](../concepts/external-scalers.md)

**Parameter list:**

- `scalerAddress`: "hostname:port" of the external push scaler implementing `ExternalScaler.StreamIsActive` in externalscaler.proto.
- `tlsCertFile`: optional path for a certificate to use for the GRPC connection

The entire metadata object is passed to the external scaler in `ScaledObjectRef.scalerMetadata`

### Authentication Parameters

Not supported.

### Example

```yaml
apiVersion: keda.k8s.io/v1alpha1
kind: ScaledObject
metadata:
  name: name
  namespace: namespace
spec:
  scaleTargetRef:
    deploymentName: keda-node
  triggers:
  - type: external-push
    metadata:
      scalerAddress: external-scaler-service:8080
      tlsCertFile: /path/to/tls/cert.pem # optional
```
