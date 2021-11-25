+++
title = "New Relic"
availability = "2.5+"
maintainer = "Community"
description = "Scale applications based on New Relic NRQL"
layout = "scaler"
go_file = "newrelic_scaler"
+++

### Trigger Specification

This specification describes the `new-relic` trigger that scales based on a New Relic metric.

```yaml
triggers:
  - type: new-relic
    metadata:
      # Required: Account - Subaccount to run the query on
      account: 1234567
      # Required: QueryKey - Api key to connect to New Relic
      queryKey: "NRAK-xxxxxxxxxxxxxxxxxxxxxxxxxxx"
      # Optional: nrRegion - Region to query data for
      region: "US"
      # Required: metricName
      metricName: "duration"
      # Required: nrql
      nrql: "SELECT average(duration) from Transaction where appName='SITE' TIMESERIES"
      # Required: threshold
      threshold: 100
```

**Parameter list:**

- `account` - The account within New Relic that the request should be targeted against.
- `queryKey` - The API key that will be leveraged to connect to New Relic and make requests. [official documentation](https://docs.newrelic.com/docs/apis/intro-apis/new-relic-api-keys/)
- `region` - The region to connect to for the New Relic apis. (Values: `LOCAL`, `EU`, `STAGING`, `US`, Default: `US`, Optional)
- `metricName` - The metric to pull from the query result.
- `nrql` - The New Relic query that will be run to get the data requested. [official documentation](https://docs.newrelic.com/docs/query-your-data/nrql-new-relic-query-language/get-started/introduction-nrql-new-relics-query-language/)
- `threshold` - A threshold that is used as the `targetAverageValue` in the HPA configuration.

### Authentication Parameters

- `queryKey` - The API key that will be leveraged to connect to New Relic and make requests. [official documentation](https://docs.newrelic.com/docs/apis/intro-apis/new-relic-api-keys/)

### Example

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: new-relic-secret
  namespace: my-project
type: Opaque
data:
  apiKey: TlJBSy0xMjM0NTY3ODkwMTIzNDU2Nwo= # base64 encoding of the new relic api key NRAK-12345678901234567
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-new-relic
  namespace: my-project
spec:
  secretTargetRef:
  - parameter: queryKey
    name: new-relic-secret
    key: apiKey

---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: newrelic-scaledobject
  namespace: keda
spec:
  maxReplicaCount: 12
  scaleTargetRef:
    name: dummy
  triggers:
    - type: new-relic
      metadata:
        account: 1234567
        region: "US"
        nrql: "SELECT average(duration) from Transaction where appName='SITE' TIMESERIES"
        metricName: "Avg Duration"
        threshold: 1000
        authenticationRef:
          name: keda-trigger-auth-new-relic
```
