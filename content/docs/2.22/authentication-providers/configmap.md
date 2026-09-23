+++
title = "Config Map"
+++

You can pull information into the trigger by defining the `name` of the Kubernetes `ConfigMap` and the `key` to use.

```yaml
configMapTargetRef:                       # Optional.
  - parameter: connectionString           # Required - Defined by the scale trigger
    name: my-keda-configmap-resource-name # Required.
    key: azure-storage-connectionstring   # Required.
```

**Assumptions:** `namespace` is in the same resource as referenced by `scaleTargetRef.name` in the `ScaledObject`, unless specified otherwise.
