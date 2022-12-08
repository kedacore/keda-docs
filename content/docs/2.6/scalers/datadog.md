+++
title = "Datadog"
availability = "v2.6+"
maintainer = "Datadog"
description = "Scale applications based on Datadog."
go_file = "datadog_scaler"
+++

> 💡 **NOTE:** Take into account [API Datadog endpoints rate
limits](https://docs.datadoghq.com/api/latest/rate-limits/) when defining
polling interval. For more detailed information about polling intervals check
[the Polling intervals and Datadog rate limiting
section](#polling-intervals-and-datadog-rate-limiting).

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
- `timeWindowOffset`: The delayed time window offset (in seconds) to wait for the metric to be available. The values of some queries might be not available at now and need a small delay to become available, try to adjust `timeWindowOffset` if you encounter this issue. (Default: `0`, Optional)
- `lastAvailablePointOffset`: The offset to retrieve the X to last data point. The value of last data point of some queries might be inaccurate (because of the implicit rollup fucntion)[https://docs.datadoghq.com/dashboards/functions/rollup/#rollup-interval-enforced-vs-custom], try to adjust to `1` if you encounter this issue. (Default: `0`, Optional)
### Authentication

Datadog requires both an API key and an APP key to retrieve metrics from your account.

You should use `TriggerAuthentication` CRD to configure the authentication:

**Parameter list:**
- `apiKey` - Datadog API key.
- `appKey` - Datadog APP key.
- `datadogSite` - Datadog site where to get the metrics from. This is commonly referred as DD_SITE in Datadog documentation. (Default: `datadoghq.com`, Optional)

### Example

The example below uses the default KEDA polling interval (30 seconds). Take into
account that [API Datadog endpoints are rate
limited](https://docs.datadoghq.com/api/latest/rate-limits/) and reducing the
polling interval can accelerate reaching it.

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

## Polling intervals and Datadog rate limiting

[API Datadog endpoints are rate
limited](https://docs.datadoghq.com/api/latest/rate-limits/). Depending on the
state of the `ScaledObject` there are two different parameters to control how
often (per `ScaledObject`) we query Datadog for a metric.

When scaling from 0 to 1, the polling interval is controlled by KEDA, using [the
`spec.pollingInterval` parameter in the `ScaledObject`
definition](../concepts/scaling-deployments/#pollinginterval). For example, if
this parameter is set to `60`, KEDA will poll Datadog for a metric value every
60 seconds while the number of replicas is 0.

While scaling from 1 to N, on top of KEDA, the HPA will also poll regularly
Datadog for metrics, based on [the `--horizontal-pod-autoscaler-sync-period`
parameter to the
`kube-controller-manager`](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/#options),
which by default is 15 seconds. For example, if the `kube-controller-manager`
was started with `--horizontal-pod-autoscaler-sync-period=30`, the HPA will poll
Datadog for a metric value every 30 seconds while the number of replicas is
between 1 and N.
