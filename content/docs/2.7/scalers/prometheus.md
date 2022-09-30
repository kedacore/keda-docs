+++
title = "Prometheus"
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
    # Required fields:
    serverAddress: http://<prometheus-host>:9090
    metricName: http_requests_total # Note: name to identify the metric, generated value would be `prometheus-http_requests_total`
    query: sum(rate(http_requests_total{deployment="my-deployment"}[2m])) # Note: query must return a vector/scalar single element response
    threshold: '100'
    # Optional fields:
    namespace: example-namespace  # for namespaced queries, eg. Thanos
    cortexOrgID: my-org # Optional. X-Scope-OrgID header for Cortex.
```

**Parameter list:**

- `serverAddress` - Address of Prometheus. server
- `metricName` - Name to identify the Metric in the external.metrics.k8s.io API. If using more than one trigger it is required that all `metricName`(s) be unique.
- `query` - Query to run.
- `threshold` - Value to start scaling for.
- `namespace` - A namespace that should be used for namespaced queries. These are required by some highly available Prometheus setups, such as [Thanos](https://thanos.io). (Optional)
- `cortexOrgID` - The `X-Scope-OrgID` header to query multi tenant [Cortex](https://cortexmetrics.io/) or [Mimir](https://grafana.com/oss/mimir/). (Optional)

### Authentication Parameters

Prometheus Scaler supports three types of authentication - bearer authentication, basic authentication and TLS authentication.

You can use `TriggerAuthentication` CRD to configure the authentication. It is possible to specify multiple authentication types i.e. `authModes: "tls,basic"` Specify `authModes` and other trigger parameters along with secret credentials in `TriggerAuthentication` as mentioned below:

**Bearer authentication:**
- `authModes`: It must contain `bearer` in case of Bearer Authentication. Specify this in trigger configuration.
- `bearerToken`: The token needed for authentication. This is a required field.

**Basic authentication:**
- `authMode`: It must contain `basic` in case of Basic Authentication. Specify this in trigger configuration.
- `username` - This is a required field. Provide the username to be used for basic authentication.
- `password` - Provide the password to be used for authentication. For convenience, this has been marked optional, because many applications implement basic auth with a username as apikey and password as empty.

**TLS authentication:**
- `authMode`: It must contain `tls` in case of TLS Authentication. Specify this in trigger configuration.
- `ca` - Certificate authority file for TLS client authentication.
- `cert` - Certificate for client authentication. This is a required field.
- `key` - Key for client authentication. Optional. This is a required field.

> 💡 **NOTE:**It's also possible to set the CA certificate regardless of the selected `authMode` (also without any authentication). This might be useful if you are using an enterprise CA.

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

Here is an example of a prometheus scaler with Basic Authentication, define the `Secret` and `TriggerAuthentication` as follows

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-prom-secret
  namespace: default
data:
  bearerToken: "BEARER_TOKEN"
  ca: "CUSTOM_CA_CERT"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-prom-creds
  namespace: default
spec:
  secretTargetRef:
    - parameter: bearerToken
      name: keda-prom-secret
      key: bearerToken
      # might be required if you're using a custom CA
    - parameter: ca
      name: keda-prom-secret
      key: ca
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: prometheus-scaledobject
  namespace: keda
  labels:
    deploymentName: dummy
spec:
  maxReplicaCount: 12
  scaleTargetRef:
    name: dummy
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://<prometheus-host>:9090
        metricName: http_requests_total
        threshold: '100'
        query: sum(rate(http_requests_total{deployment="my-deployment"}[2m]))
        authModes: "bearer"
      authenticationRef:
        name: keda-prom-creds
```

Here is an example of a prometheus scaler with Basic Authentication, define the `Secret` and `TriggerAuthentication` as follows

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-prom-secret
  namespace: default
data:
  username: "dXNlcm5hbWUK" # Must be base64
  password: "cGFzc3dvcmQK"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-prom-creds
  namespace: default
spec:
  secretTargetRef:
    - parameter: username
      name: keda-prom-secret
      key: username
    - parameter: password
      name: keda-prom-secret
      key: password
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: prometheus-scaledobject
  namespace: keda
  labels:
    deploymentName: dummy
spec:
  maxReplicaCount: 12
  scaleTargetRef:
    name: dummy
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://<prometheus-host>:9090
        metricName: http_requests_total
        threshold: '100'
        query: sum(rate(http_requests_total{deployment="my-deployment"}[2m]))
        authModes: "basic"
      authenticationRef:
        name: keda-prom-creds
```


Here is an example of a prometheus scaler with TLS Authentication, define the `Secret` and `TriggerAuthentication` as follows

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-prom-secret
  namespace: default
data:
  cert: "cert"
  key: "key"
  ca: "ca"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-prom-creds
  namespace: default
spec:
  secretTargetRef:
    - parameter: cert
      name: keda-prom-secret
      key: cert
    - parameter: key
      name: keda-prom-secret
      key: key
    - parameter: ca
      name: keda-prom-secret
      key: ca
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: prometheus-scaledobject
  namespace: keda
  labels:
    deploymentName: dummy
spec:
  maxReplicaCount: 12
  scaleTargetRef:
    name: dummy
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://<prometheus-host>:9090
        metricName: http_requests_total
        threshold: '100'
        query: sum(rate(http_requests_total{deployment="my-deployment"}[2m]))
        authModes: "tls"
      authenticationRef:
        name: keda-prom-creds
```

Here is an example of a prometheus scaler with TLS and Basic Authentication, define the `Secret` and `TriggerAuthentication` as follows

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-prom-secret
  namespace: default
data:
  cert: "cert"
  key: "key"
  ca: "ca"
  username: "username"
  password: "password"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-prom-creds
  namespace: default
spec:
  secretTargetRef:
    - parameter: cert
      name: keda-prom-secret
      key: cert
    - parameter: key
      name: keda-prom-secret
      key: key
    - parameter: ca
      name: keda-prom-secret
      key: ca
    - parameter: username
      name: keda-prom-secret
      key: username
    - parameter: password
      name: keda-prom-secret
      key: password
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: prometheus-scaledobject
  namespace: keda
  labels:
    deploymentName: dummy
spec:
  maxReplicaCount: 12
  scaleTargetRef:
    name: dummy
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://<prometheus-host>:9090
        metricName: http_requests_total
        threshold: '100'
        query: sum(rate(http_requests_total{deployment="my-deployment"}[2m]))
        authModes: "tls,basic"
      authenticationRef:
        name: keda-prom-creds
```
