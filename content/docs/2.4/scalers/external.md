+++
title = "External"
layout = "scaler"
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
    tlsCertFile : /path/to/tls/cert.pem
```

**Parameter list:**

- `scalerAddress` - Address of the external scaler. Format must be `host:port`.
- `tlsCertFile` - Location of a certificate to use for the GRPC connection to authenticate with. (optional)

> For implementing an external scaler, refer to [External Scalers Concept](../concepts/external-scalers.md).

### Authentication Parameters

Not supported yet.

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
