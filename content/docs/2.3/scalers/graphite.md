+++
title = "Graphite"
layout = "scaler"
availability = "v1.0+"
maintainer = "Community"
description = "Scale applications based on Graphite."
go_file = "graphite_scaler"
+++

### Trigger Specification

This specification describes the `graphite` trigger that scales based on a Graphite.

```yaml
triggers:
- type: graphite
  metadata:
    # Required
    serverAddress: http://<graphite-host>:81
    metricName: request-count
    query: stats.counters.http.hello-world.request.count.count # Note: query must return a vector/scalar single element response
    threshold: '100'
    queryTime: '-10minutes'
```

**Parameter list:**

- `serverAddress` - Address of Graphite
- `metricName` - Metric name to use
- `query` - Query to run
- `threshold` - Value to start scaling for
- `queryTime` - Query Time to from 


### Example

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: graphite-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: my-deployment
  triggers:
  - type: graphite
    metadata:
      serverAddress: http://<graphite-host>:9090
      metricName: request-count
      threshold: '100'
      query: stats.counters.http.hello-world.request.count.count
      queryTime: '-10minutes'
```
