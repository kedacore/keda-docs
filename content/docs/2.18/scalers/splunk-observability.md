+++
title = "Splunk Observability"
availability = "v2.18+"
maintainer = "Community"
category = "Data & Storage"
description = "Scale applications based on Splunk Observability Cloud metrics."
go_file = "splunk_observability_scaler"
+++

### Trigger Specification

This specification describes the `splunk-observability` trigger that scales based on the result of a metric series queried from the Splunk Observability Cloud platform with a [SignalFlow query](https://dev.splunk.com/observability/docs/signalflow/).

The trigger always requires the following information (shown below with example values):

```yaml
triggers:
  - type: splunk-observability
    metadata:
      query: "data('demo.trans.latency').max().publish()"
      duration: "10"
      targetValue: "400.1"
      activationTargetValue: "1.1"
      queryAggregator: "avg"
```

**Parameter list:**

- `query` - SignalFlow query for querying the desired metrics.
- `duration` - Duration of the stream being created to query a Metric Time Series (MTS) from Splunk Observability Cloud. The specified duration is in seconds.
- `targetValue` - Threshold to reach to start scaling.
- `activationTargetValue` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).
- `queryAggregator` - When querying metrics from Splunk Observability Cloud, initially a Metric Time Series (MTS) is returned, a list consiting of several datapoints. The 'queryAggregator' speicifies how this series of metrics should be "rolled up". Valid values for this field are "avg", which returnes the average, "min", which returns the minimun of the metrics in the series, and "max", which returns the maximun value.

### Authentication Parameters

You can authenticate by using an access token and a realm for Splunk Observability Cloud. You will need to use `TriggerAuthentication` CRD to configure the authentication.

> **Note:**
>
> `TriggerAuthentication` is required to use this scaler due to the hard requirement of providing a `accessToken` and a `realm` for Splunk Observability Cloud.

**Parameter list:**

- `accessToken` - Splunk Observability Cloud Access Token.
- `realm` - Splunk Observability Cloud Realm.

### Example

The following example shows how to scale a simple NGINX employment with the help of KEDA and the Splunk Observability Cloud scaler:

#### Simple NGINX employment

```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  selector:
    matchLabels:
      app: nginx
  replicas: 1
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx:1.14.2
          ports:
            - containerPort: 80
```

#### Authentication

```yaml
---
apiVersion: v1
kind: Secret
metadata:
  name: splunk-secrets
data:
  accessToken: <base64-encoded access token>
  realm: <base64-encoded realm>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-splunk-secret
spec:
  secretTargetRef:
    - parameter: accessToken
      name: splunk-secrets
      key: accessToken
    - parameter: realm
      name: splunk-secrets
      key: realm
```

#### Keda Scaler

```yaml
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: keda
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nginx
  pollingInterval: 30
  cooldownPeriod: 30
  minReplicaCount: 1
  maxReplicaCount: 10
  triggers:
    - type: splunk-observability
      metricType: Value
      metadata:
        query: "data('demo.trans.count', filter=filter('demo_host', 'server6'), rollup='rate').sum(by=['demo_host']).publish()"
        duration: "10"
        queryValue: "400.1"
        activationQueryValue: "1.1"
        queryAggregator: "max" # 'min', 'max', or 'avg'
      authenticationRef:
        name: keda-trigger-auth-splunk-secret
```