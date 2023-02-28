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
    metricName: http_requests_total # DEPRECATED: This parameter is deprecated as of KEDA v2.10 and will be removed in version 2.12. Note: name to identify the metric, generated value would be `prometheus-http_requests_total`
    query: sum(rate(http_requests_total{deployment="my-deployment"}[2m])) # Note: query must return a vector/scalar single element response
    threshold: '100.50'
    activationThreshold: '5.5'
    # Optional fields:
    namespace: example-namespace  # for namespaced queries, eg. Thanos
    cortexOrgID: my-org # DEPRECATED: This parameter is deprecated as of KEDA v2.10 in favor of customHeaders and will be removed in version 2.12. Use custom headers instead to set X-Scope-OrgID header for Cortex. (see below)
    customHeaders: X-Client-Id=cid,X-Tenant-Id=tid,X-Organization-Id=oid # Optional. Custom headers to include in query. In case of auth header, use the custom authentication or relevant authModes.
    ignoreNullValues: false # Default is `true`, which means ignoring the empty value list from Prometheus. Set to `false` the scaler will return error when Prometheus target is lost
    unsafeSsl: "false" #  Default is `false`, Used for skipping certificate check when having self signed certs for Prometheus endpoint
```

**Parameter list:**

- `serverAddress` - Address of Prometheus server. If using VictoriaMetrics cluster version, set full URL to Prometheus querying API, e.g. `http://<vmselect>:8481/select/0/prometheus`
- `metricName` - Name to identify the Metric in the external.metrics.k8s.io API. (DEPRECATED: This parameter is deprecated as of KEDA v2.10 and will be removed in version `2.12`)
- `query` - Query to run.
- `threshold` - Value to start scaling for. (This value can be a float)
- `activationThreshold` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional, This value can be a float)
- `namespace` - A namespace that should be used for namespaced queries. These are required by some highly available Prometheus setups, such as [Thanos](https://thanos.io). (Optional)
- `cortexOrgID` - DEPRECATED: This parameter is deprecated as of KEDA v2.10 in favor of `customHeaders` and will be removed in version 2.12. Use `customHeaders: X-Scope-OrgID=##` instead to query multi tenant [Cortex](https://cortexmetrics.io/) or [Mimir](https://grafana.com/oss/mimir/). (Optional)
- `customHeaders` - Custom headers to include while querying the prometheus endpoint. In case of authentication headers, use custom authentication or relevant `authModes` instead. (Optional)
- `ignoreNullValues` - Value to reporting error when Prometheus target is lost (Values: `true`,`false`, Default: `true`, Optional)
- `unsafeSsl` - Used for skipping certificate check e.g: using self signed certs  (Values: `true`,`false`, Default: `false`, Optional)

### Authentication Parameters

Prometheus Scaler supports five types of authentication - bearer authentication, basic authentication, TLS authentication, custom authentication and Azure Workload/Pod Identity for Azure managed service for Prometheus.

You can use `TriggerAuthentication` CRD to configure the authentication. It is possible to specify multiple authentication types i.e. `authModes: "tls,basic"` Specify `authModes` and other trigger parameters along with secret credentials in `TriggerAuthentication` as mentioned below:

**Bearer authentication:**
- `authModes`: It must contain `bearer` in case of Bearer Authentication. Specify this in trigger configuration.
- `bearerToken`: The token needed for authentication. This is a required field.

**Basic authentication:**
- `authModes`: It must contain `basic` in case of Basic Authentication. Specify this in trigger configuration.
- `username` - This is a required field. Provide the username to be used for basic authentication.
- `password` - Provide the password to be used for authentication. For convenience, this has been marked optional, because many applications implement basic auth with a username as apikey and password as empty.

**TLS authentication:**
- `authModes`: It must contain `tls` in case of TLS Authentication. Specify this in trigger configuration.
- `ca` - Certificate authority file for TLS client authentication.
- `cert` - Certificate for client authentication. This is a required field.
- `key` - Key for client authentication. Optional. This is a required field.

**Custom authentication:**
- `authModes`: It must contain `custom` in case of Custom Authentication. Specify this in trigger configuration.
- `customAuthHeader`: Custom Authorization Header name to be used. This is required field.
- `customAuthValue`: Custom Authorization Header value. This is required field.

> 💡 **NOTE:**It's also possible to set the CA certificate regardless of the selected `authModes` (also without any authentication). This might be useful if you are using an enterprise CA.

**Auth for Azure managed service for Prometheus:**
- See the `Azure managed service for Prometheus` section later on this page.

### Examples

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
      metricName: http_requests_total # DEPRECATED: This parameter is deprecated as of KEDA v2.10 and will be removed in version 2.12
      threshold: '100'
      query: sum(rate(http_requests_total{deployment="my-deployment"}[2m]))
```

Here is an example of a prometheus scaler with Bearer Authentication, define the `Secret` and `TriggerAuthentication` as follows

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
        metricName: http_requests_total # DEPRECATED: This parameter is deprecated as of KEDA v2.10 and will be removed in version 2.12
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
        metricName: http_requests_total # DEPRECATED: This parameter is deprecated as of KEDA v2.10 and will be removed in version 2.12
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
        metricName: http_requests_total # DEPRECATED: This parameter is deprecated as of KEDA v2.10 and will be removed in version 2.12
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
        metricName: http_requests_total # DEPRECATED: This parameter is deprecated as of KEDA v2.10 and will be removed in version 2.12
        threshold: '100'
        query: sum(rate(http_requests_total{deployment="my-deployment"}[2m]))
        authModes: "tls,basic"
      authenticationRef:
        name: keda-prom-creds
```

Here is an example of a prometheus scaler with Custom Authentication, define the `Secret` and `TriggerAuthentication` as follows

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-prom-secret
  namespace: default
data:
  customAuthHeader: "X-AUTH-TOKEN"
  customAuthValue: "auth-token"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-prom-creds
  namespace: default
spec:
  secretTargetRef:
    - parameter: customAuthHeader
      name: keda-prom-secret
      key: customAuthHeader
    - parameter: customAuthValue
      name: keda-prom-secret
      key: customAuthValue
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
        authModes: "custom"
      authenticationRef:
        name: keda-prom-creds
```

### Azure managed service for Prometheus

Azure has a [managed service for Prometheus](https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/prometheus-metrics-overview) and Prometheus scaler can be used to run prometheus query against that.
- [Azure AD Pod Identity](https://docs.microsoft.com/en-us/azure/aks/use-azure-ad-pod-identity) or [Azure AD Workload Identity](https://azure.github.io/azure-workload-identity/docs/) providers can be used for Auth.
- No other auth (via `authModes`) can be provided with Azure Pod/Workload Identity Auth.
- Prometheus query endpoint can be retreived from [Azure Monitor Workspace](https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/azure-monitor-workspace-overview) that was configured to ingest prometheus metrics.
- `cloud` can be provided in the trigger metadata if needed.

Here is an example of a prometheus scaler with Azure Pod Identity and Azure Workload Identity, define the `TriggerAuthentication` and `ScaledObject` as follows

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: azure-managed-prometheus-trigger-auth
spec:
  podIdentity:
      provider: azure | azure-workload # use "azure" for pod identity and "azure-workload" for workload identity
      identityId: <identity-id> # Optional. Default: Identity linked with the label set when installing KEDA.

---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: azure-managed-prometheus-scaler
spec:
  scaleTargetRef:
    name: deployment-name-to-be-scaled
  minReplicaCount: 1
  maxReplicaCount: 20
  triggers:
  - type: prometheus
    metadata:
      serverAddress: https://test-azure-monitor-workspace-name-9ksc.eastus.prometheus.monitor.azure.com
      metricName: http_requests_total
      query: sum(rate(http_requests_total{deployment="my-deployment"}[2m])) # Note: query must return a vector/scalar single element response
      threshold: '100.50'
      activationThreshold: '5.5'
      # Optional (Default: AzurePublicCloud)
      cloud: Private
      # Required when cloud = Private
      azureManagedPrometheusResourceURL: https://prometheus.monitor.azure.airgap/.default
    authenticationRef:
      name: azure-managed-prometheus-trigger-auth
```