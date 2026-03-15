+++
title = "KEDA Add-on"
availability = "v2.20+"
maintainer = "KEDA"
category = "Extensibility"
description = "Scale applications based on KEDA add-on scaler."
+++

### Overview

The KEDA add-on scaler provides a mechanism for KEDA add-ons to manage scaling without requiring users to configure complex external scaler details. Instead of manually specifying `scalerAddress`, metadata, and other configuration, the add-on scaler uses a discovery mechanism where add-ons expose their scaling capabilities through a Custom Resource Definition (CRD).

This approach offers several benefits:

- **Automatic Configuration Discovery**: Add-ons expose their scaling logic through a CRD status, reducing the need for manual configuration
- **Simplified User Experience**: Users only need to reference an add-on CRD by name and namespace, not internal scaler details
- **Centralized Configuration**: All add-on scaling configuration lives in one place (the add-on CRD)

> NOTE: This scaler is still experiemtnal

### Trigger Specification

This specification describes the `keda-add-on` trigger for KEDA add-ons.

```yaml
triggers:
- type: keda-add-on
  metadata:
    name: my-add-on-cr
    kind: MyAddOnKind
    apiVersion: my-api-group/v1alpha1
```

**Parameter list:**

- `name` - The name of the add-on Custom Resource to reference. (Required)
- `kind` - The kind of the add-on Custom Resource (e.g., `InterceptorRoute`, `HTTPScaledObject`). (Required)
- `apiVersion` - The API version of the add-on Custom Resource (e.g., `http.keda.sh/v1alpha1`). (Required)

### How It Works

#### Discovery Mechanism

The KEDA add-on scaler follows this process:

1. **Fetch CRD**: The scaler looks up the referenced Custom Resource by name, namespace, kind, and apiVersion when the `ScaledObject|ScaledJob` is created or updated
2. **Read Status**: The scaler reads the CRD's status field to discover:
   - The external scaler addres
   - Scaling metrics information
   - Default thresholds and target values
3. **Delegate Scaling**: The scaler uses the discovered information to delegate actual scaling decisions to the add-on's external scaler (via gRPC)

