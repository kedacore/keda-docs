+++
title = "Environment variable"
+++

You can pull information via one or more environment variables by providing the `name` of the variable for a given `containerName`.

```yaml
env:                              # Optional.
  - parameter: region             # Required - Defined by the scale trigger
    name: my-env-var              # Required.
    containerName: my-container   # Optional. Default: scaleTargetRef.envSourceContainerName of ScaledObject
```

**Assumptions:** `containerName` is in the same resource as referenced by `scaleTargetRef.name` in the ScaledObject, unless specified otherwise.
