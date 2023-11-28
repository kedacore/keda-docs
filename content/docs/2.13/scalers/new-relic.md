+++
title = "New Relic"
availability = "2.6+"
maintainer = "Community"
description = "Scale applications based on New Relic NRQL"
go_file = "newrelic_scaler"
+++

### Trigger Specification

This specification describes the `new-relic` trigger that scales based on a New Relic metric.

```yaml
triggers:
  - type: new-relic
    metadata:
      # Required: Account - Subaccount to run the query on
      account: '1234567'
      # Required: QueryKey - Api key to connect to New Relic
      queryKey: "NRAK-xxxxxxxxxxxxxxxxxxxxxxxxxxx"
      # Optional: nrRegion - Region to query data for. Default value is US.
      region: "US"
      # Optional: noDataError - If the query returns no data should this be treated as an error. Default value is false.
      noDataError: "true"
      # Required: nrql
      nrql: "SELECT average(duration) from Transaction where appName='SITE'"
      # Required: threshold
      threshold: "50.50"
      # Optional: activationThreshold - Target value for activating the scaler.
      activationThreshold: "20.1"
```

**Parameter list:**

- `account` - The account within New Relic that the request should be targeted against.
- `queryKey` - The API key that will be leveraged to connect to New Relic and make requests. [official documentation](https://docs.newrelic.com/docs/apis/intro-apis/new-relic-api-keys/)
- `region` - The region to connect to for the New Relic apis. (Values: `LOCAL`, `EU`, `STAGING`, `US`, Default: `US`, Optional)
- `noDataError` - Should queries that return nodata be treated as an error, if set to false and a query returns nodata, the result be `0`. (Values: `true`, `false`, Default: `false`, Optional)
- `nrql` - The New Relic query that will be run to get the data requested. [official documentation](https://docs.newrelic.com/docs/query-your-data/nrql-new-relic-query-language/get-started/introduction-nrql-new-relics-query-language/)
- `threshold` - A threshold that is used as the `targetValue` or `targetAverageValue` (depending on the trigger metric type) in the HPA configuration. (This value can be a float)
- `activationThreshold` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional, This value can be a float)

### Authentication Parameters

You can use `TriggerAuthentication` CRD to configure the authentication with a `queryKey`.

**Authentication:**

- `queryKey` - The API key that will be leveraged to connect to New Relic and make requests. [official documentation](https://docs.newrelic.com/docs/apis/intro-apis/new-relic-api-keys/)

- `account` - The account within New Relic that the request should be targeted against. This can be used to replace the value that would be provided in the trigger.

- `region` - The region to connect to for the New Relic apis. This can be used to replace the value that would be provided in the trigger.

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
  account: MTIzNDU2 # base64 encoding of the new relic account number 123456
  region: VVM= # base64 encoding of the new relic region US
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
  - parameter: account
    name: new-relic-secret
    key: account
  - parameter: region
    name: new-relic-secret
    key: region

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
        nrql: "SELECT average(duration) from Transaction where appName='SITE'"
        noDataError: "true"
        threshold: '1000'
      authenticationRef:
        name: keda-trigger-auth-new-relic
```
