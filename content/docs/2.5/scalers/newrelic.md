+++
title = "Newrelic"
availability = "2.5+"
maintainer = "Community"
description = "Scale applications based on NewRelic NRQL"
layout = "scaler"
go_file = "newrelic_scaler"
+++

### Trigger Specification

This specification describes the `Newrelic` trigger that scales based on a Newrelic metric.

```yaml
triggers:
  - type: newrelic
    metadata:
      # Required: nrAccount - Subaccount to run the query on
      nrAccount: 1234567
      # Required: nrQueryKey - Api key to connect to New Relic
      nrQueryKey: "NRAK-xxxxxxxxxxxxxxxxxxxxxxxxxxx"
      # Required: nrRegion - Region to query data for
      nrRegion: "US"
      # Required: metricName
      metricName: "duration"
      # Required: nrql
      nrql: "SELECT average(duration) from Transaction where appName='SITE' TIMESERIES"
      # Required: threshold
      threshold: 100
      # Optional: nrLogLevel
      nrLogLevel: "info"
```

**Parameter list:**

- `nrAccount` - The account within Newrelic that the request should be targeted against
- `nrQueryKey` - The API key that will be leveraged to connect to Newrelic and make requests. [official documentation](https://docs.newrelic.com/docs/apis/intro-apis/new-relic-api-keys/)
- `nrRegion` - The region to connect to for the Newrelic apis. (Values: `LOCAL`, `EU`, `STAGING`, `US`)
- `metricName` - The metric to pull from the query result.
- `nrql` - The Newrelic query that will be run to get the data requested. [official documentation](https://docs.newrelic.com/docs/query-your-data/nrql-new-relic-query-language/get-started/introduction-nrql-new-relics-query-language/)
- `threshold` - A threshold that is used as the `targetAverageValue` in the HPA configuration.
- `nrLogLevel` - The logging level of the underlying Newrelic class to aid in debugging. (Values: `debug`, `error`, `fatal`, `info`, `trace`, `warn`, Optional)

### Authentication Parameters

### Example

```yaml
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: newrelic-scaledobject
  namespace: keda
  labels:
    deploymentName: dummy
spec:
  maxReplicaCount: 12
  scaleTargetRef:
    name: dummy
  triggers:
    - type: newrelic
      metadata:
        nrAccount: 1234567
        nrQueryKey: "NRAK-12345678901234567"
        nrRegion: "US"
        nrql: "SELECT average(duration) from Transaction where appName='SITE' TIMESERIES"
        metricName: "Avg Duration"
        threshold: 1000
```
