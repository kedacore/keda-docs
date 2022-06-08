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
    targetValue: '100'
    credentialsFromEnv: GOOGLE_APPLICATION_CREDENTIALS_JSON
    alignmentPeriodSeconds: 60
    alignmentAligner: mean
    alignmentReducer: none
```

**Parameter list:**

- `projectId` - GCP project Id that contains the metric.
- `filter` - The stackdriver query filter for obtaining the metric. The metric is for the last minute and if multiple values are returned, the first one is used.
- `targetValue` - Average target value to trigger scaling actions. (Default: `5`, Optional)

The `credentialsFromEnv` property maps to the name of an environment variable in the scale target (`scaleTargetRef`) that contains the service account credentials (JSON). KEDA will use those to connect to Google Cloud Platform and collect the configured stack driver metrics.

The `alignmentPeriodSeconds`, `alignmentAligner` and `alignmentReducer` properties controls time series aggregation before the metrics are returned. See below for more details.

### Timeseries alignment properties
It is much better to aggregate the time series values before they are returned from stackdriver instead of getting the raw values.
For that, you must specify a value of 60 or more for the `alignmentPeriodSeconds` property as well as an alignment operation in the `alignmentAligner` property and/or a reducer in the `alignmentReducer` property.

Valid values for the `alignmentAligner` property are: none, delta, interpolate, next_older, min, max, mean, count, sum, stddev, count_true, count_false, fraction_true, percentile_99, percentile_95, percentile_50, percentile_05 and percent_change.
Valid values for the `alignmentReducer` property are: none, mean, min, max, sum, stddev, true, false, fraction_true, percentile_99, percentile_95, percentile_50 and percentile_05.

For more information on aggregation, see [here](https://cloud.google.com/monitoring/api/v3/aggregation#aggr-intro).

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
```