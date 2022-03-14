+++
title = "Google Cloud Platform Stackdriver"
availability = "2.7+"
maintainer = "Community"
description = "Scale applications based on a metric obtained from Stackdriver."
layout = "scaler"
go_file = "gcp_stackdriver_scaler"
+++

### Trigger Specification

This specification describes the `gcp-stackdriver` trigger for GCP Stackdriver. It scales based on a metric obtained from issuing a query to Stackdriver.

```yaml
triggers:
- type: gcp-stackdriver
  metadata:
    projectId: my-project-id
    filter: 'metric.type="storage.googleapis.com/network/received_bytes_count" AND resource.type="gcs_bucket" AND metric.label.method="WriteObject" AND resource.label.bucket_name="my-gcp-bucket"'
    metricName: my-gcp-bucket
    targetValue: '100'
    credentialsFromEnv: GOOGLE_APPLICATION_CREDENTIALS_JSON # Optional
    credentialsFromEnvFile: GOOGLE_APPLICATION_CREDENTIALS_JSON # Optional
```

**Parameter list:**

- `projectId` - GCP project Id that contains the metric.
- `filter` - The stackdriver query filter for obtaining the metric. The metric is for the last minute and if multiple values are returned, the first one is used.
- `metricName` - Metric name for reporting the value to HPA, prefixed with `s{triggerIndex}-gcp-stackdriver-`.
- `targetValue` - Average target value to trigger scaling actions. (Default: `5`, Optional)

You can provide in the metadata either `credentialsFromEnv` or `credentialsFromEnvFile`.
- `credentialsFromEnv` - Set to the name of the environment variable that holds the credential information.
- `credentialsFromEnvFile` - Set to the name of a json file that holds the credential information.

### Authentication Parameters
You can use `TriggerAuthentication` CRD to configure the authenticate by providing the service account credentials in JSON. 

**Credential based authentication:**

- `GoogleApplicationCredentials` - Service account credentials in JSON.

**Identity based authentication:**

You can also use `TriggerAuthentication` CRD to configure the authentication using the associated service account of the running machine in Google Cloud. You only need to create a `TriggerAuthentication` as this example, and reference it in the `ScaledObject`. `ClusterTriggerAuthentication` can also be used if you intend to use it globally in your cluster.

### Examples

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: gcp-stackdriver-scaledobject
  namespace: keda-gcp-stackdriver-test
spec:
  scaleTargetRef:
    name: keda-gcp-stackdriver-go
  triggers:
  - type: gcp-stackdriver
    metadata:
      projectId: my-project-id
      filter: 'metric.type="storage.googleapis.com/network/received_bytes_count" AND resource.type="gcs_bucket" AND metric.label.method="WriteObject" AND resource.label.bucket_name="my-gcp-bucket"'
      targetValue: "5"
      metricName: gcp-stackdriver
      credentialsFromEnv: GOOGLE_APPLICATION_CREDENTIALS_JSON
```

#### Use TriggerAuthentication with Kubernetes secret

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-gcp-credentials
spec:
  secretTargetRef:
  - parameter: GoogleApplicationCredentials 
    name: gcp-stackdriver-secret        # Required. Refers to the name of the secret
    key: GOOGLE_APPLICATION_CREDENTIALS_JSON       # Required.
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: gcp-stackdriver-scaledobject
spec:
  scaleTargetRef:
    name: keda-gcp-stackdriver-go
  triggers:
  - type: gcp-stackdriver
    authenticationRef:
      name: keda-trigger-auth-gcp-credentials
    metadata:
      projectId: my-project-id
      filter: 'metric.type="storage.googleapis.com/network/received_bytes_count" AND resource.type="gcs_bucket" AND metric.label.method="WriteObject" AND resource.label.bucket_name="my-gcp-bucket"'
      metricName: gcp-stackdriver
```

#### Use TriggerAuthentication with GCP Identity

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-gcp-credentials
spec:
  podIdentity:
    provider: gcp
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: gcp-stackdriver-scaledobject
spec:
  scaleTargetRef:
    name: keda-gcp-stackdriver-go
  triggers:
  - type: gcp-stackdriver
    authenticationRef:
      name: keda-trigger-auth-gcp-credentials
    metadata:
      projectId: my-project-id
      filter: 'metric.type="storage.googleapis.com/network/received_bytes_count" AND resource.type="gcs_bucket" AND metric.label.method="WriteObject" AND resource.label.bucket_name="my-gcp-bucket"'
      metricName: gcp-stackdriver
```