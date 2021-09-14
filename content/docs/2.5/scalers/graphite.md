+++
title = "Graphite"
layout = "scaler"
availability = "v2.5+"
maintainer = "Community"
description = "Scale applications based on metrics in Graphite."
go_file = "graphite_scaler"
+++

### Trigger Specification

This specification describes the `graphite` trigger that scales based on metrics in Graphite.

```yaml
triggers:
- type: graphite
  metadata:
    # Required
    serverAddress: http://<graphite-host>:81
    metricName: request-count # Note: name to identify the metric
    query: stats.counters.http.hello-world.request.count.count # Note: query must return a vector/scalar single element response
    threshold: '100'
    queryTime: '-10Minutes' # Note: Query time in from argv Seconds/Minutes/Hours
```
**Parameter list:**

- `serverAddress` - Address of Graphite
- `metricName` - Name to identify the Metric in the external.metrics.k8s.io API. If using more than one trigger it is required that all `metricName`(s) be unique
- `query` - Query to run
- `threshold` - Value to start scaling for
- `queryTime` - Relative time range to execute query against. Please see the [graphite API docs](https://graphite-api.readthedocs.io/en/latest/api.html#from-until) for more information.

### Authentication Parameters

Graphite Scaler supports one type of authentication - basic authentication

**Basic authentication:**
- `authMode`: It must contain `basic` in case of Basic Authentication. Specify this in trigger configuration.
- `username`: This is a required field. Provide the username to be used for basic authentication.
- `password`: Provide the password to be used for authentication. For convenience, this has been marked optional, because many applications implement basic auth with a username as apikey and password as empty.

### Examples

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
      serverAddress: http://<graphite-host>:81
      metricName: LagMetric
      threshold: '100'
      query: maxSeries(keepLastValue(reportd.*.gauge.detect.latest_max_time.value, 1))
      queryTime: '-1Minutes'
```

Here is an example of a Graphite Scaler with Basic Authentication, define the `Secret` and `TriggerAuthentication` as follows

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-graphite-secret
  namespace: default
data:
  username: "dXNlcm5hbWUK" # Must be base64
  password: "cGFzc3dvcmQK"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-graphite-creds
  namespace: default
spec:
  secretTargetRef:
    - parameter: username
      name: keda-graphite-secret
      key: username
    - parameter: password
      name: keda-graphite-secret
      key: password
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: graphite-scaledobject
  namespace: default
  labels:
    deploymentName: php-apache-graphite
spec:
  cooldownPeriod: 10
  maxReplicaCount: 5
  minReplicaCount: 0
  pollingInterval: 5
  scaleTargetRef:
    name: php-apache-graphite
  triggers:
  - type: graphite
    metadata:
      authMode: "basic"
      metricName: https_metric
      query: https_metric
      queryTime: -1Hours
      serverAddress: http://<graphite server>:81
      threshold: "100"
    authenticationRef:
        name: keda-graphite-creds
```
