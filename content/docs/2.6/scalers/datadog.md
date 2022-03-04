+++
title = "Datadog"
layout = "scaler"
availability = "v2.6+"
maintainer = "Datadog"
description = "Scale applications based on Datadog."
go_file = "datadog_scaler"
+++

> 💡 **NOTE:** Take into account [API Datadog endpoints rate limits](https://docs.datadoghq.com/api/latest/rate-limits/) when defining polling interval

### Trigger Specification

This specification describes the `datadog` trigger that scales based on a Datadog metric.

```yaml
triggers:
- type: datadog
  metadata:
    query: "sum:trace.redis.command.hits{env:none,service:redis}.as_count()"
    queryValue: "7"
    type: "global"
    age: "120"
```

**Parameter list:**

- `query` - The Datadog query to run.
- `queryValue` - Value to reach to start scaling.
- `type` - Whether to start scaling based on the value or the average between pods. (Values: `average`, `global`, Default:`average`, Optional)
- `age`: The time window (in seconds) to retrieve metrics from Datadog. (Default: `90`, Optional) 

### Authentication

Datadog requires both an API key and an APP key to retrieve metrics from your account.

You should use `TriggerAuthentication` CRD to configure the authentication:

**Parameter list:**
- `apiKey` - Datadog API key.
- `appKey` - Datadog APP key.
- `datadogSite` - Datadog site where to get the metrics from. This is commonly referred as DD_SITE in Datadog documentation. (Default: `datadoghq.com`, Optional)

### Example

The example below uses the default KEDA polling interval (30 seconds). Take into account that [API Datadog endpoints are rate limited](https://docs.datadoghq.com/api/latest/rate-limits/) and reducing the polling interval can accelerate reaching it. If your account has reached its rate limit, a relevant error will be logged in KEDA.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: datadog-secrets
  namespace: my-project
type: Opaque
data:
  apiKey: # Required: base64 encoded value of Datadog apiKey
  appKey: # Required: base64 encoded value of Datadog appKey
  datadogSite: # Optional: base64 encoded value of Datadog site
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-datadog-secret
  namespace: my-project
spec:
  secretTargetRef:
    # Required: API key for your Datadog account
  - parameter: apiKey
    name: datadog-secrets
    key: apiKey
    # Required: APP key for your Datadog account
  - parameter: appKey
    name: datadog-secrets
    key: appKey
    # Optional: Datadog site. Default: "datadoghq.com"
  - parameter: datadogSite
    name: datadog-secrets
    key: datadogSite
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: datadog-scaledobject
  namespace: my-project
spec:
  scaleTargetRef:
    name: worker
  triggers:
  - type: datadog
    metadata:
      # Required: datadog metric query
      query: "sum:trace.redis.command.hits{env:none,service:redis}.as_count()"
      # Required: according to the number of query result, to scale the TargetRef
      queryValue: "7"
      # Optional: (Global or Average). Whether the target value is global or average per pod. Default: Average
      type: "Global"
      # Optional: The time window (in seconds) to retrieve metrics from Datadog. Default: 90
      age: "120"
    authenticationRef:
      name: keda-trigger-auth-datadog-secret
```
