+++
title = "Metrics API"
availability = "v2.0+"
maintainer = "Community"
description = "Scale applications based on a metric provided by an API"
go_file = "metrics_api_scaler"
+++

### Trigger Specification

This specification describes the `metrics-api` trigger that scales based on a metric value provided by an API.

This scaler allows users to utilize **any existing APIs** as a metric provider.

Here is an example of trigger configuration using metrics-api scaler:

```yaml
triggers:
- type: metrics-api
  metadata:
    targetValue: "8"
    url: "http://api:3232/api/v1/stats"
    valueLocation: "components.worker.tasks"
```

**Parameter list:**

- `url` - Full URL of the API operation to call to get the metric value (eg. `http://app:1317/api/v1/stats`).
- `valueLocation` - [GJSON path notation](https://github.com/tidwall/gjson#path-syntax) to refer to the field in the payload containing the metric value.
- `targetValue` - Target value to scale on. When the metric provided by the API is equal or higher to this value, KEDA will start scaling out. When the metric is 0 or less, KEDA will scale down to 0.

### Authentication Parameters

Metrics Scaler API supported three types of authentication - API Key based authentication, basic authentication and TLS
authentication.

You can use `TriggerAuthentication` CRD to configure the authentication. Specify `authMode` and other trigger parameters
 along with secret credentials in `TriggerAuthentication` as mentioned below:

**API Key based authentication:**
- `authMode`: It must be set to `apiKey` in case of API key Authentication. Specify this in trigger configuration.
- `method` - This specifies the possible methods API Key based authentication supports. Possible values are `header` and `query`. `header` is the default method. Specify this in trigger configuration.
- `keyParamName` - This is either header key or query param used for passing apikey. Default header is `X-API-KEY` and default query param is `api_key`. Specify this in trigger configuration. If your implementation has different key, please specify it here.
- `apiKey` - API Key needed for authentication.

**Basic authentication:**
- `authMode` - It must be set to `basic` in case of Basic Authentication. Specify this in trigger configuration.
- `username` - This is a required field. Provide the username to be used for basic authentication.
- `password` - Provide the password to be used for authentication. For convenience, this has been marked optional,
because many application implements basic auth with a username as apikey and password as empty.

**TLS authentication:**
- `authMode` - It must be set to `tls` in case of TLS Authentication. Specify this in trigger configuration.
- `ca` - Certificate authority file for TLS client authentication. This is a required field.
- `cert` - Certificate for client authentication. This is a required field.
- `key` - Key for client authentication. Optional. This is a required field.

### Example

Here is a full example of scaled object definition using Metric API trigger:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: http-scaledobject
  namespace: keda
  labels:
    deploymentName: dummy
spec:
  maxReplicaCount: 12
  scaleTargetRef:
    name: dummy
  triggers:
    - type: metrics-api
      metadata:
        targetValue: "7"
        url: "http://api:3232/components/stats"
        valueLocation: 'components.worker.tasks'
```

When checking current metric Metrics API scaler sends GET request to provided `url` and then uses `valueLocation`
to access the value in response's payload.

The above example expects that the API endpoint will return response similar to this one:
```json
{
  "components": {
    "worker": {
      "tasks": 12,
      ...
    },
    ...
  },
  ...
}
```
Assuming such response, Metrics API trigger will figure out that current metric value is 12.

> 💡 **NOTE:**The value of the metric must be json number type. The value is casted to **integer**.

Here is an example of a  metric scaler with API Key based authentication,

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-metric-api-secret
  namespace: default
data:
  apiKey: "APIKEY"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-metric-api-creds
  namespace: default
spec:
  secretTargetRef:
    - parameter: apiKey
      name: keda-metric-api-secret
      key: apiKey
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: http-scaledobject
  namespace: keda
  labels:
    deploymentName: dummy
spec:
  maxReplicaCount: 12
  scaleTargetRef:
    name: dummy
  triggers:
    - type: metrics-api
      metadata:
        targetValue: "7"
        url: "http://api:3232/components/stats"
        valueLocation: 'components.worker.tasks'
        authMode: "apiKey"
        method: "query"
        keyParamName: "QUERY_KEY"
      authenticationRef:
        name: keda-metric-api-creds
```

Here is an example of a  metric scaler with Basic Authentication, define the `Secret` and `TriggerAuthentication` as follows

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-metric-api-secret
  namespace: default
data:
  username: "username"
  password: "password"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-metric-api-creds
  namespace: default
spec:
  secretTargetRef:
    - parameter: username
      name: keda-metric-api-secret
      key: username
    - parameter: password
      name: keda-metric-api-secret
      key: password
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: http-scaledobject
  namespace: keda
  labels:
    deploymentName: dummy
spec:
  maxReplicaCount: 12
  scaleTargetRef:
    name: dummy
  triggers:
    - type: metrics-api
      metadata:
        targetValue: "7"
        url: "http://api:3232/components/stats"
        valueLocation: 'components.worker.tasks'
        authMode: "basic"
      authenticationRef:
        name: keda-metric-api-creds
```


Here is an example of a  metric scaler with TLS Authentication, define the `Secret` and `TriggerAuthentication` as follows

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-metric-api-secret
  namespace: default
data:
  cert: "cert"
  key: "key"
  ca: "ca"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-metric-api-creds
  namespace: default
spec:
  secretTargetRef:
    - parameter: cert
      name: keda-metric-api-secret
      key: cert
    - parameter: key
      name: keda-metric-api-secret
      key: key
    - parameter: ca
      name: keda-metric-api-secret
      key: ca
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: http-scaledobject
  namespace: keda
  labels:
    deploymentName: dummy
spec:
  maxReplicaCount: 12
  scaleTargetRef:
    name: dummy
  triggers:
    - type: metrics-api
      metadata:
        targetValue: "7"
        url: "http://api:3232/components/stats"
        valueLocation: 'components.worker.tasks'
        authMode: "tls"
      authenticationRef:
        name: keda-metric-api-creds
```
