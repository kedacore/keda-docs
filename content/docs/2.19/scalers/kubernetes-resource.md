+++
title = "Kubernetes Resource"
availability = "v2.19+"
maintainer = "Community"
category = "Kubernetes"
description = "Scale applications based on values in Kubernetes ConfigMaps or Secrets"
go_file = "kubernetes_resource_scaler"
+++

### Trigger Specification

This specification describes the `kubernetes-resource` trigger that scales based on a value found in a Kubernetes ConfigMap or Secret.

This scaler allows users to scale workloads by extracting values from Kubernetes resources, supporting number, JSON, and YAML formats.

Here is an example of trigger configuration using kubernetes-resource scaler:

```yaml
triggers:
- type: kubernetes-resource
  metadata:
    resourceKind: "Secret"
    resourceName: "my-secret"
    key: "data"
    format: "json"
    valueLocation: "count"
    valueType: "float64"
    targetValue: "10"
    activationTargetValue: "5"
```

**Parameter list:**

- `resourceKind` - Type of Kubernetes resource to read from. Supported values: `ConfigMap`, `Secret` (Required)
- `resourceName` - Name of the resource to read. (Required)
- `key` - Key in the ConfigMap's `data` field or Secret's `data` field to read from. The value at this key is retrieved as a string. (Required)
- `format` - Format of the string value retrieved from `key`. Supported values: `number`, `json`, `yaml`. (Default: `number`, Optional)
  - `number` - The string value is parsed directly as a number
  - `json` - The string value is a JSON document, and `valueLocation` extracts a field from it
  - `yaml` - The string value is a YAML document, and `valueLocation` extracts a field from it
- `valueLocation` - Path to extract the metric value from the JSON or YAML content retrieved from `key`. Required for `json` and `yaml` formats. Not used for `number` format. For `json`, use [GJSON path notation](https://github.com/tidwall/gjson#path-syntax). For `yaml`, use dot-separated path (e.g., `foo.bar.count`). (Optional)
- `valueType` - Type of value to extract. Supported values: `float64`, `int64`, `quantity`. (Default: `float64`, Optional)
  - `float64` - Floating point number. For JSON format, accepts both numbers and quantity strings.
  - `int64` - Integer number. For JSON format, only accepts integer numbers (decimal values are truncated). For `number` format, the string must be parseable as an integer.
  - `quantity` - Kubernetes quantity (e.g., "100m", "1Gi"). For JSON/YAML formats, parses string values as quantities. For JSON format, also accepts raw numbers.
- `targetValue` - Target value to scale on. When the extracted value is equal or higher, KEDA will scale out. (Required)
- `activationTargetValue` - Value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)

### Authentication Parameters

No authentication parameters are required. The scaler uses the permissions of the KEDA operator to access resources in the same namespace.

### Example

Here is a full example of scaled object definition using Kubernetes Resource trigger:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: k8s-resource-scaledobject
  namespace: keda
spec:
  maxReplicaCount: 10
  scaleTargetRef:
    name: dummy
  triggers:
    - type: kubernetes-resource
      metadata:
        resourceKind: "ConfigMap"
        resourceName: "my-configmap"
        key: "metrics"
        format: "yaml"
        valueLocation: "count"
        valueType: "int64"
        targetValue: "10"
```

Assuming the ConfigMap contains:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-configmap
  namespace: keda
data:
  metrics: |
    count: 12
    other: value
```

The scaler will extract the value at `count` from the YAML data in the `metrics` key and use it for scaling decisions.

> 💡 **NOTE:** 
> - The `valueType` parameter controls how values are parsed. For `int64`, decimal values in JSON are truncated to integers.
> - For `json` format, use GJSON path syntax. For `yaml` format, use dot-separated path. For `number` format, the value at the key is used directly.
> - For YAML format, the `valueType` primarily affects string values. Numeric YAML values are automatically converted to float64.

### Additional Examples

#### Example 1: Number Format (Direct Value)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: task-count
  namespace: keda
data:
  count: "42"
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: task-scaler
  namespace: keda
spec:
  scaleTargetRef:
    name: worker-deployment
  triggers:
    - type: kubernetes-resource
      metadata:
        resourceKind: "ConfigMap"
        resourceName: "task-count"
        key: "count"
        format: "number"
        valueType: "float64"
        targetValue: "50"
        activationTargetValue: "10"
```

In this example, the value `42` from the `count` key is used directly.

#### Example 2: JSON Format

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: metrics-data
  namespace: keda
stringData:
  metrics: |
    {
      "queue": {
        "pending": 25,
        "processing": 5
      }
    }
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: queue-scaler
  namespace: keda
spec:
  scaleTargetRef:
    name: processor-deployment
  triggers:
    - type: kubernetes-resource
      metadata:
        resourceKind: "Secret"
        resourceName: "metrics-data"
        key: "metrics"
        format: "json"
        valueLocation: "queue.pending"
        valueType: "int64"
        targetValue: "20"
```

In this example, the GJSON path `queue.pending` extracts the value `25` from the JSON data.

#### Example 3: YAML Format with Nested Path

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-metrics
  namespace: keda
data:
  stats: |
    application:
      workers:
        active: 15
        idle: 3
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: worker-scaler
  namespace: keda
spec:
  scaleTargetRef:
    name: worker-deployment
  triggers:
    - type: kubernetes-resource
      metadata:
        resourceKind: "ConfigMap"
        resourceName: "app-metrics"
        key: "stats"
        format: "yaml"
        valueLocation: "application.workers.active"
        valueType: "int64"
        targetValue: "10"
```

In this example, the dot-separated path `application.workers.active` extracts the value `15` from the YAML data.

#### Example 4: Quantity Type

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: resource-limits
  namespace: keda
data:
  memory: |
    {
      "available": "2Gi",
      "used": "512Mi"
    }
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: memory-scaler
  namespace: keda
spec:
  scaleTargetRef:
    name: worker-deployment
  triggers:
    - type: kubernetes-resource
      metadata:
        resourceKind: "ConfigMap"
        resourceName: "resource-limits"
        key: "memory"
        format: "json"
        valueLocation: "used"
        valueType: "quantity"
        targetValue: "1024000000"  # 1Gi in bytes
```

In this example, the quantity string `"512Mi"` is parsed and converted to its float64 representation for scaling decisions.

> ⚠️ **Important:** When using `valueType: "int64"` with JSON format, decimal values will be truncated. For example, if the JSON contains `{"count": 25.7}`, it will be treated as `25`.

### Supported Formats and Value Extraction

The scaler works in two steps:

1. **Retrieve the raw string**: Read the value from `ConfigMap.data[key]` or `Secret.data[key]`
2. **Extract the metric**: Parse the raw string based on the `format`:
   - **number**: The raw string is parsed directly as a number. No `valueLocation` is needed.
     - Example: If `key="count"` and `ConfigMap.data.count = "42"`, the metric value is `42`
   - **json**: The raw string is parsed as JSON, then `valueLocation` (using GJSON syntax) extracts the metric value.
     - Example: If `key="metrics"` and `ConfigMap.data.metrics = '{"tasks": 10}'`, with `valueLocation="tasks"`, the metric value is `10`
   - **yaml**: The raw string is parsed as YAML, then `valueLocation` (using dot-separated path) extracts the metric value.
     - Example: If `key="stats"` and `ConfigMap.data.stats = 'count: 15'`, with `valueLocation="count"`, the metric value is `15`

### Limitations

- Only resources in the same namespace as the ScaledObject are supported.
- No cross-namespace access.
- Only ConfigMaps and Secrets are supported.
- The scaler uses the KEDA operator's service account permissions to access resources.

### See Also

- [KEDA Concepts: Activating and Scaling Thresholds](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds)
- [GJSON Path Syntax](https://github.com/tidwall/gjson#path-syntax)
