+++
title = "Prometheus"
layout = "scaler"
availability = "v1.0+"
maintainer = "Community"
description = "Scale applications based on Prometheus."
go_file = "prometheus_scaler"
+++

### Trigger Specification

This specification describes the `prometheus` trigger that scales based on a Prometheus.

```yaml
triggers:
- type: prometheus
  metadata:
    # Required
    serverAddress: http://<prometheus-host>:9090
    metricName: http_requests_total
    query: sum(rate(http_requests_total{deployment="my-deployment"}[2m])) # Note: query must return a vector/scalar single element response
    threshold: '100'
```

**Parameter list:**

- `serverAddress` - Address of Prometheus
- `metricName` - Metric name to use
- `query` - Query to run
- `threshold` - Value to start scaling for

### Authentication Parameters

Not supported yet.

### Example

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: prometheus-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: my-deployment
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://<prometheus-host>:9090
      metricName: http_requests_total
      threshold: '100'
      query: sum(rate(http_requests_total{deployment="my-deployment"}[2m]))
```
