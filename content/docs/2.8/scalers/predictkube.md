+++
title = "Predictkube"
availability = "v2.6+"
maintainer = "Dysnix"
description = "AI-based predictive scaling based on Prometheus metrics & PredictKube SaaS."
layout = "scaler"
go_file = "predictkube_scaler"
+++

PredictKube is an open-source project with the SAAS part consisting of an AI model that requires API to connect to the project for the main functions of predicting and scaling.

To make our AI model access your data and make a prediction based on it, please use the API key we'll send to your e-mail.

Review our [Privacy Policy](https://predictkube.com/privacy-policy) to see how your data circulates in and out PredictKube.

### Trigger Specification

This specification describes the `predictkube` trigger that scales based on a predicting load based on `prometheus` metrics.

```yaml
triggers:
- type: predictkube
  metadata:
    # Required fields:
    predictHorizon: "2h"
    historyTimeWindow: "7d"
    prometheusAddress: http://<prometheus-host>:9090
    query: sum(rate(http_requests_total{deployment="my-deployment"}[2m]))
    queryStep: "2m"
    threshold: '100'
    # Optional fields:
    metricName: http_requests_total
```

**Parameter list:**

- `predictHorizon` - Prediction time interval. It is usually equal to the cool-down period of your application.
- `historyTimeWindow` - Time range for which to request metrics from Prometheus. We recommend using minimum 7-14 days time window as historical data.
- `prometheusAddress` - Address of Prometheus server.
- `query` - Predict the query that will yield the value for the scaler to compare against the `threshold`. The query must return a vector/scalar single element response.
- `queryStep` - The maximum time between two slices within the boundaries for QML range query, used in the query.
- `threshold` - Value to start scaling for.
- `metricName` - Name to identify the Metric in the external.metrics.k8s.io API. (Optional, Default: `predictkube_metric`)

### Authentication Parameters

Predictkube Scaler supports one type of authentication - authentication by API key.
Prometheus used in Predictkube Scaler supports all authentication methods that are available in Prometheus Scaler.

**Auth gateway based authentication:**

- `apiKey` - API key previously issued for this tenant. You can get your API key by clicking on any **GET API KEY** button on the [website of PredictKube](https://predictkube.com/)

### Example

```yaml
---
apiVersion: v1
kind: Secret
metadata:
  name: predictkube-secrets
  namespace: some-namespace
type: Opaque
data:
  apiKey: # Required: base64 encoded value of PredictKube apiKey
  bearerToken: "BEARER_TOKEN" # Optional: bearer authentication for Prometheus
  ca: "CUSTOM_CA_CERT" # Optional: certificate authority file for TLS client authentication for Prometheus
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-predictkube-secret
  namespace: some-namespace
spec:
  secretTargetRef:
    # Required: API key for your predictkube account
  - parameter: apiKey
    name: predictkube-secrets
    key: apiKey
    # Optional: might be required if you're using bearer auth for Promethrus
  - parameter: bearerToken
    name: keda-prom-secret
    key: bearerToken
    # Optional: might be required if you're using a custom CA for Promethrus
  - parameter: ca
    name: keda-prom-secret
    key: ca
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: predictkube-scaledobject
  namespace: some-namespace
spec:
  scaleTargetRef:
    name: my-deployment
    kind: StatefulSet
  pollingInterval: 30
  cooldownPeriod: 7200
  minReplicaCount: 3
  maxReplicaCount: 50
  triggers:
  - type: predictkube
    metadata:
      predictHorizon: "2h"
      historyTimeWindow: "7d"
      prometheusAddress: http://<prometheus-host>:9090
      query: sum(rate(http_requests_total{deployment="my-deployment"}[2m])) # Note: query must return a vector/scalar single element response
      queryStep: "2m" # Note: query step duration for range prometheus queries
      threshold: "100"
      authModes: "bearer" # might be required if you're using bearer auth for Promethrus
    authenticationRef:
      name: keda-trigger-auth-predictkube-secret
```
