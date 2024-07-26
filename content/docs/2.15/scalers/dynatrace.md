+++
title = "Dynatrace"
availability = "2.15+"
maintainer = "Community"
description = "Scale applications based on Dynatrace metric data points"
go_file = "dynatrace_scaler"
+++

### Trigger Specification

This specification describes the `dynatrace` trigger that scales based on Dynatrace metric data points.

```yaml
triggers:
  - type: dynatrace
    metadata:
      host: https://dummy-instance.live.dynatrace.com/
      metricSelector: 'MyCustomEvent:filter(eq("someProperty","someValue")):count:splitBy("dt.entity.process_group"):fold'
      # Optional
      from: now-2d
      threshold: "10"
      # Optional
      activationThreshold: "5"
```

**Parameter list:**

- `host` - The Dynatrace instance to query against
- `token` - The API key that will be leveraged to connect to Dynatrace and make requests ([official documentation](https://docs.dynatrace.com/docs/dynatrace-api/basics/dynatrace-api-authentication)). Requires the `metrics.read` scope. Must be provided via Trigger Authentication (see [Authentication Parameters](#authentication-parameters))
- `metricSelector` - The metric selector query and any transformations that should be applied to it ([transformations docs](https://docs.dynatrace.com/docs/dynatrace-api/environment-api/metric-v2/metric-selector)).

  Some relevant aspects:
    - The selector should focus on a **single metric and dimension**: if multiple are found, a warning is issued and only the first one is considered
    - The metric data points should be aggregated to produce a single output value (e.g., using the [fold transformation](https://docs.dynatrace.com/docs/shortlink/api-metrics-v2-selector#fold)): if multiple values are found, only the first one is considered
    - If you need to use the entity selector, do it through the `:filter` transformation in the metric selector
- `from` - How far back the metric selector should consider when fetching data points. [syntax supported](https://docs.dynatrace.com/docs/dynatrace-api/environment-api/metric-v2/get-data-points#parameters). (Optional, default `now-2h`, i.e., the last 2 hours)
- `threshold` - A threshold that is used as the `targetValue` or `targetAverageValue` (depending on the trigger metric type) in the HPA configuration. (This value can be a float)
- `activationThreshold` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Optional, default `0`, can be a float)

### Authentication Parameters

You can use `TriggerAuthentication` CRD to configure authentication the `host` and `token` parameters.

**Authentication:**

- `host` - The Dynatrace instance to query against
- `token` - The API key that will be leveraged to connect to Dynatrace and make requests ([official documentation](https://docs.dynatrace.com/docs/dynatrace-api/basics/dynatrace-api-authentication)). Requires the `metrics.read` scope

### Example

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: dynatrace-secret
  namespace: my-project
type: Opaque
data:
  host: aHR0cHM6Ly9kdW1teS1pbnN0YW5jZS5saXZlLmR5bmF0cmFjZS5jb20vCg== # base64 encoding of https://dummy-instance.live.dynatrace.com/
  token: ZHQwczAxLlNUMkVZNzJLUUlOTUg1NzRXTU5WSTdZTi5HM0RGUEJFSllNT0RJREFFWDQ1NE03WVdCVVZFRk9XS1BSVk1XRkFTUzY0TkZINTJQWDZCTkRWRkZNNTcyUlpNCg== # base64 encoding of the dynatrace example api key dt0s01.ST2EY72KQINMH574WMNVI7YN.G3DFPBEJYMODIDAEX454M7YWBUVEFOWKPRVMWFASS64NFH52PX6BNDVFFM572RZM
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-dynatrace
  namespace: my-project
spec:
  secretTargetRef:
  - parameter: token
    name: dynatrace-secret
    key: token
  - parameter: host
    name: dynatrace-secret
    key: host
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: dynatrace-scaledobject
  namespace: keda
spec:
  maxReplicaCount: 12
  scaleTargetRef:
    name: dummy
  triggers:
    - type: dynatrace
      metadata:
        metricSelector: 'MyCustomEvent:filter(eq("someProperty","someValue")):count:splitBy("dt.entity.process_group"):fold'
        from: 'now-30m'
        threshold: '1000'
      authenticationRef:
        name: keda-trigger-auth-dynatrace
```
