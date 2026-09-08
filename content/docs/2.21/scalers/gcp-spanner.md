+++
title = "Google Cloud Platform Spanner"
availability = "2.21+"
maintainer = "Community"
category = "Data & Storage"
description = "Scale applications based on the result of a Google Cloud Spanner SQL query."
go_file = "gcp_spanner_scaler"
+++

### Trigger Specification

This specification describes the `gcp-spanner` trigger for [Google Cloud Spanner](https://cloud.google.com/spanner).

```yaml
triggers:
- type: gcp-spanner
  metadata:
    projectId: my-gcp-project          # Required
    instanceId: my-spanner-instance    # Required
    databaseId: my-database            # Required
    query: "SELECT COUNT(*) FROM jobs WHERE status = 'pending'"  # Required
    targetValue: "5"                   # Optional - Default: 5
    activationValue: "0"               # Optional - Default: 0
    credentialsFromEnv: GOOGLE_APPLICATION_CREDENTIALS_JSON  # Optional
    credentialsFromEnvFile: GOOGLE_APPLICATION_CREDENTIALS_JSON # Optional
```

**Parameter list:**

- `projectId` - The GCP project that owns the Spanner instance.
- `instanceId` - The Spanner instance ID.
- `databaseId` - The Spanner database ID.
- `query` - A SQL statement that returns exactly one row with one `INT64` column. When the query matches no rows the value is treated as `0`.
- `targetValue` - Average target value to trigger scaling actions. Must be greater than `0`. (Default: `5`, Optional)
- `activationValue` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)

The metric name will be generated automatically based on the trigger index and the resource identifiers, for example: **s0-gcp-spanner-instanceId-databaseId-projectId**.

You can provide in the metadata either `credentialsFromEnv` or `credentialsFromEnvFile`.
- `credentialsFromEnv` - Set to the name of the environment variable that holds the credential information.
- `credentialsFromEnvFile` - Set to the name of a json file that holds the credential information.

### Authentication Parameters

You can use `TriggerAuthentication` CRD to configure the authentication by providing the service account credentials in JSON.

**Credential based authentication:**

- `GoogleApplicationCredentials` - Service account credentials in JSON.

**Identity based authentication:**

You can also use `TriggerAuthentication` CRD to configure the authentication using the associated service account of the running machine in Google Cloud. You only need to create a `TriggerAuthentication` as this example, and reference it in the `ScaledObject`. `ClusterTriggerAuthentication` can also be used if you intend to use it globally in your cluster.

### Examples

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: spanner-scaledobject
  namespace: my-namespace
spec:
  scaleTargetRef:
    name: job-processor
  triggers:
  - type: gcp-spanner
    metadata:
      projectId: my-gcp-project
      instanceId: my-spanner-instance
      databaseId: my-database
      query: "SELECT COUNT(*) FROM jobs WHERE status = 'pending'"
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
    name: gcp-spanner-secret        # Required. Refers to the name of the secret
    key: GOOGLE_APPLICATION_CREDENTIALS_JSON       # Required.
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: spanner-scaledobject
spec:
  scaleTargetRef:
    name: job-processor
  triggers:
  - type: gcp-spanner
    authenticationRef:
      name: keda-trigger-auth-gcp-credentials
    metadata:
      projectId: my-gcp-project
      instanceId: my-spanner-instance
      databaseId: my-database
      query: "SELECT COUNT(*) FROM jobs WHERE status = 'pending'"
      targetValue: "5"
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
  name: spanner-scaledobject
spec:
  scaleTargetRef:
    name: job-processor
  triggers:
  - type: gcp-spanner
    authenticationRef:
      name: keda-trigger-auth-gcp-credentials
    metadata:
      projectId: my-gcp-project
      instanceId: my-spanner-instance
      databaseId: my-database
      query: "SELECT COUNT(*) FROM jobs WHERE status = 'pending'"
      targetValue: "5"
```
