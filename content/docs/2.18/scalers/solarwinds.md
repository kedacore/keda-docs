+++
title = "Solarwinds"
availability = "v2.18+"
maintainer = "Community"
description = "Scale applications based on metrics from Solarwinds."
go_file = "solarwinds_scaler"
+++

### Trigger Specification

This specification describes the `solarwinds` trigger that scales based on metrics from Solarwinds.

```yaml
triggers:
- type: solarwinds
  metadata:
    host: https://api.na-01.cloud.solarwinds.com
    targetValue: "1"
    activationValue: "3"
    metricName: "k8s.pod.cpu.usage.seconds.rate"
    aggregation: "AVG"
    intervalS: "60"
    filter: "k8s.deployment.name:my-deployment"
```

**Parameter list:**

- `host` - The Solarwinds API endpoint. (Example: `https://api.na-01.cloud.solarwinds.com`)
- `targetValue` - Value to reach to start scaling. (This value can be an integer or float)
- `activationValue` - Target value for activating the scaler. (Optional, Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds))
- `metricName` - The name of the metric to monitor.
- `aggregation` - The aggregation method to use. (Values: `COUNT`, `MIN`, `MAX`, `AVG`, `SUM`, `LAST`)
- `intervalS` - The interval in seconds for the metric collection.
- `filter` - The filter to apply to the metric data. (Optional, Examples below)
  - `key1:value1 key2:value2` - Search using key values pairs with a delimiting space for an implicit AND
  - `key:[value1,value2]` - Search using IN operator (key equals value1 or value2)
  - `key:~value` - Search using CONTAINS operator
  - `key>value1 key<value2` - Use comparative operators for number based keys such as (“=”, “>”, “<“, “<=”, “>=”) (key between value1 and value2)
  - `NOT key:""` - Search using NOT operator and EMPTY value (key is not empty)
  - `entities(attribute:value)` - search using attributes of entities related to the metric data (metric values associated with entity having attribute equals value)

### Authentication Parameters

You can use `TriggerAuthentication` CRD to configure the authentication by providing the necessary credentials.

**Credential based authentication:**

- `apiToken` - The API token for accessing Solarwinds Observability. See [doc](https://documentation.solarwinds.com/en/success_center/observability/content/settings/api-tokens.htm) for more information.

### Example

Here is an example of a Solarwinds Scaler with authentication:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: solarwinds-secret
  namespace: default
data:
  apiToken: <base64-encoded-api-token>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: solarwinds-auth
  namespace: default
spec:
  secretTargetRef:
    - parameter: apiToken
      name: solarwinds-secret
      key: apiToken
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: solarwinds-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: nginx
  pollingInterval: 15
  minReplicaCount: 1
  maxReplicaCount: 2
  triggers:
  - type: solarwinds
    authenticationRef:
      name: solarwinds-auth
    metadata:
      host: https://api.na-01.cloud.solarwinds.com
      targetValue: "3"
      activationValue: "3"
      metricName: "k8s.pod.cpu.usage.seconds.rate"
      aggregation: "AVG"
      intervalS: "60"
      filter: "k8s.deployment.name:my-deployment"
```
