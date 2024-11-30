+++
title = "Bound service account token"
+++

You can pull a service account token into the trigger by defining the `serviceAccountName` of the Kubernetes ServiceAccount and token `expiry` duration.

```yaml
boundServiceAccountToken:                        # Optional.
  - parameter: connectionString                  # Required - Defined by the scale trigger
    serviceAccountName: my-keda-service-account  # Required.
    expiry: 1h                                   # Required.
```

**Assumptions:** `namespace` is in the same resource as referenced by `scaleTargetRef.name` in the ScaledObject, unless specified otherwise.
