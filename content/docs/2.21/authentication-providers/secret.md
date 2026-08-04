+++
title = "Secret"
+++

You can pull one or more secrets into the trigger by defining the `name` of the Kubernetes Secret and the `key` to use.

```yaml
secretTargetRef:                          # Optional.
  - parameter: connectionString           # Required - Defined by the scale trigger
    name: my-keda-secret-entity           # Required.
    key: azure-storage-connectionstring   # Required.
```

**Assumptions:** `namespace` is in the same resource as referenced by `scaleTargetRef.name` in the ScaledObject, unless specified otherwise.
