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
    query: sum(rate(http_requests_total{deployment="my-deployment"}[2m])) # Note: query must return a vector/scalar single element response
    queryParameters: key-1=value-1,key-2=value-2
    threshold: '100.50'
    activationThreshold: '5.5'
    # Optional fields:
    namespace: example-namespace  # for namespaced queries, eg. Thanos
    cortexOrgID: my-org # DEPRECATED: This parameter is deprecated as of KEDA v2.10 in favor of customHeaders and will be removed in version 2.12. Use custom headers instead to set X-Scope-OrgID header for Cortex. (see below)
    customHeaders: X-Client-Id=cid,X-Tenant-Id=tid,X-Organization-Id=oid # Optional. Custom headers to include in query. In case of auth header, use the custom authentication or relevant authModes.
    ignoreNullValues: false # Default is `true`, which means ignoring the empty value list from Prometheus. Set to `false` the scaler will return error when Prometheus target is lost
    unsafeSsl: "false" #  Default is `false`, Used for skipping certificate check when having self-signed certs for Prometheus endpoint    

```

**Parameter list:**

- `serverAddress` - Address of Prometheus server. If using VictoriaMetrics cluster version, set full URL to Prometheus querying API, e.g. `http://<vmselect>:8481/select/0/prometheus`
- `query` - Query to run.
- `queryParameters` - A comma-separated list of query Parameters to include while querying the Prometheus endpoint.
- `threshold` - Value to start scaling for. (This value can be a float)
- `activationThreshold` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional, This value can be a float)
- `namespace` - A namespace that should be used for namespaced queries. These are required by some highly available Prometheus setups, such as [Thanos](https://thanos.io). (Optional)
- `cortexOrgID` - DEPRECATED: This parameter is deprecated as of KEDA v2.10 in favor of `customHeaders` and will be removed in version 2.12. Use `customHeaders: X-Scope-OrgID=##` instead to query multi tenant [Cortex](https://cortexmetrics.io/) or [Mimir](https://grafana.com/oss/mimir/). (Optional)
- `customHeaders` - Custom headers to include while querying the prometheus endpoint. In case of authentication headers, use custom authentication or relevant `authModes` instead. (Optional)
- `ignoreNullValues` - Value to reporting error when Prometheus target is lost (Values: `true`,`false`, Default: `true`, Optional)
- `unsafeSsl` - Used for skipping certificate check e.g: using self-signed certs  (Values: `true`,`false`, Default: `false`, Optional)

### Authentication Parameters

Prometheus Scaler supports various types of authentication to help you integrate with Prometheus.

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

### Integrating Cloud offerings

#### Amazon Managed Service for Prometheus

Amazon Web Services (AWS) offers a [managed service for Prometheus](https://aws.amazon.com/prometheus/) that provides a scalable and secure Prometheus deployment. The Prometheus scaler can be used to run Prometheus queries against this managed service.

- [EKS Pod Identity](https://aws.amazon.com/about-aws/whats-new/2023/11/amazon-eks-pod-identity/) provider can be used in `authenticationRef` - see later in example. TriggerAuthentication and Secret are also supported authentication methods.
- Create Amazon Managed Service for Prometheus [workspace](https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-onboard-create-workspace.html) in your AWS account
- Retrieve the Prometheus query endpoint URL from the [AWS managed Prometheus Workspace](https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-onboard-create-workspace.html). This endpoint will be used to send queries.
- Configure Prometheus scaler to use the workspace endpoint and an authentication method like EKS Pod Identity.

Using the managed service eliminates the operational burden of running your own Prometheus servers. Queries can be executed against a fully managed, auto-scaling Prometheus deployment on AWS. Costs scale linearly with usage.

To gain a better understanding of creating a Prometheus trigger for Google Managed Prometheus, refer to [this example](#example-amazon-managed-service-for-prometheus-amp).

#### Azure Monitor Managed Service for Prometheus

Azure has a [managed service for Prometheus](https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/prometheus-metrics-overview) and Prometheus scaler can be used to run prometheus query against that.
- [Azure AD Pod Identity](https://docs.microsoft.com/en-us/azure/aks/use-azure-ad-pod-identity) or [Azure AD Workload Identity](https://azure.github.io/azure-workload-identity/docs/) providers can be used in `authenticationRef` - see later in example.
- `Monitoring Data Reader` role needs to be assigned to workload identity (or pod identity) on the `Azure Monitor Workspace`.
- No other auth (via `authModes`) can be provided with Azure Pod/Workload Identity Auth.
- Prometheus query endpoint can be retreived from [Azure Monitor Workspace](https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/azure-monitor-workspace-overview) that was configured to ingest prometheus metrics.

To gain a better understanding of creating a Prometheus trigger for Azure Monitor Managed Service for Prometheus, refer to [this example](#example-azure-monitor-managed-service-for-prometheus).

#### Google Managed for Prometheus

Google Cloud Platform provides a comprehensive [managed service for Prometheus](https://cloud.google.com/stackdriver/docs/managed-prometheus), enabling you to effortlessly export and query Prometheus metrics.
By utilizing Prometheus scaler, you can seamlessly integrate it with the GCP managed service and handle authentication using the GCP workload identity mechanism.

See the follwowing steps to configure the scaler integration.

- Setup [GCP Workload Identity](./../authentication-providers/gcp-workload-identity) on KEDA operator;
- Assign the [Monitoring Viewer](https://cloud.google.com/iam/docs/understanding-roles#monitoring.viewer) role (namely `roles/monitoring.viewer`) to the Google Service Account on Identity Access and Management (IAM).
- No other auth (via `authModes`) should be provided other than GCP workload identity auth;
- Prometheus server address should follow the Google's Monitoring API for [Prometheus HTTP API](https://cloud.google.com/stackdriver/docs/managed-prometheus/query#api-prometheus):
  - Example: `https://monitoring.googleapis.com/v1/projects/GOOGLE_PROJECT_ID/location/global/prometheus` - where `GOOGLE_PROJECT_ID` should be replaced by your Google project ID.

To gain a better understanding of creating a Prometheus trigger for Google Managed Prometheus, refer to [this example](#example-google-managed-prometheus).

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
      threshold: '100'
      query: sum(rate(http_requests_total{deployment="my-deployment"}[2m]))
```

#### Example: Bearer Authentication

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
        threshold: '100'
        query: sum(rate(http_requests_total{deployment="my-deployment"}[2m]))
        authModes: "bearer"
      authenticationRef:
        name: keda-prom-creds
```

#### Example: Basic Authentication

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
        threshold: '100'
        query: sum(rate(http_requests_total{deployment="my-deployment"}[2m]))
        authModes: "basic"
      authenticationRef:
        name: keda-prom-creds
```

#### Example: TLS Authentication

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
        threshold: '100'
        query: sum(rate(http_requests_total{deployment="my-deployment"}[2m]))
        authModes: "tls"
      authenticationRef:
        name: keda-prom-creds
```

#### Example: TLS & Basic Authentication

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
        threshold: '100'
        query: sum(rate(http_requests_total{deployment="my-deployment"}[2m]))
        authModes: "tls,basic"
      authenticationRef:
        name: keda-prom-creds
```

#### Example: Custom Authentication

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

#### Example: Azure Monitor Managed Service for Prometheus

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
    authenticationRef:
      name: azure-managed-prometheus-trigger-auth
```
#### Example: Amazon Managed Service for Prometheus (AMP)

Below is an example showcasing the use of Prometheus scaler with AWS EKS Pod Identity. Please note that in this particular example, the Deployment is named as `keda-deploy`. Also replace the AwsRegion and AMP WorkspaceId for your requirements.

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-aws-credentials
spec:
  podIdentity:
    provider: aws
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: keda-deploy
  labels:
    app: keda-deploy
spec:
  replicas: 0
  selector:
    matchLabels:
      app: keda-deploy
  template:
    metadata:
      labels:
        app: keda-deploy
    spec:
      containers:
      - name: nginx
        image: nginxinc/nginx-unprivileged
        ports:
        - containerPort: 80
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: keda-so
  labels:
    app: keda-deploy
spec:
  scaleTargetRef:
    name: keda-deploy
  maxReplicaCount: 2
  minReplicaCount: 0
  cooldownPeriod: 1
  advanced:
    horizontalPodAutoscalerConfig:
      behavior:
        scaleDown:
          stabilizationWindowSeconds: 15
  triggers:
    - type: prometheus
      authenticationRef:
        name: keda-trigger-auth-aws-credentials
      metadata:
        awsRegion: {{.AwsRegion}}
        serverAddress: "https://aps-workspaces.{{.AwsRegion}}.amazonaws.com/workspaces/{{.WorkspaceID}}"
        query: "vector(100)"
        threshold: "50.0"
        identityOwner: operator
```

#### Example: Google Managed Prometheus

Below is an example showcasing the use of Prometheus scaler with GCP Workload Identity. Please note that in this particular example, the Google project ID has been set as `my-google-project`.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ClusterTriggerAuthentication
metadata:
  name: google-workload-identity-auth
spec:
  podIdentity:
    provider: gcp
---
apiVersion: keda.sh/v1alpha1
metadata:
  name: google-managed-prometheus-scaler
spec:
  scaleTargetRef:
    name: deployment-name-to-be-scaled
  minReplicaCount: 1
  maxReplicaCount: 20
  triggers:
  - type: prometheus
    metadata:
      serverAddress: https://monitoring.googleapis.com/v1/projects/my-google-project/location/global/prometheus
      query: sum(rate(http_requests_total{deployment="my-deployment"}[2m]))
      threshold: '50.0'
    authenticationRef:
      kind: ClusterTriggerAuthentication
      name: google-workload-identity-auth
```
