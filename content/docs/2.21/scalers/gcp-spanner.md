+++
title = "Google Cloud Platform Spanner"
availability = "v2.21+"
maintainer = "Community"
category = "Data & Storage"
description = "Scale applications based on the result of a Google Cloud Spanner SQL query."
go_file = "gcp_spanner_scaler"
+++

### Trigger Specification

This specification describes the `gcp-spanner` trigger for [Google Cloud Spanner](https://cloud.google.com/spanner).

The scaler executes a user-supplied SQL statement against a Spanner database on every polling interval.
The query must return a single row whose first column is an `INT64` value — typically a `COUNT(*)` or
`SUM(...)` expression that represents current workload depth.

```yaml
triggers:
- type: gcp-spanner
  metadata:
    projectId: my-gcp-project          # Required
    instanceId: my-spanner-instance    # Required
    databaseId: my-database            # Required
    query: "SELECT COUNT(*) FROM jobs WHERE status = 'pending'"  # Required
    targetValue: "5"                   # Optional - default: 5
    activationValue: "0"               # Optional - default: 0
    credentialsFromEnv: GOOGLE_APPLICATION_CREDENTIALS_JSON  # Required*
```

> `*` One of `credentialsFromEnv`, `credentialsFromEnvFile`, or a `TriggerAuthentication`
> referencing `GoogleApplicationCredentials` / GCP pod identity is required (unless
> `SPANNER_EMULATOR_HOST` is set, in which case authentication is handled by the emulator).

**Parameter list:**

- `projectId` - The GCP project that owns the Spanner instance.
- `instanceId` - The Spanner instance ID.
- `databaseId` - The Spanner database ID.
- `query` - A SQL statement that returns exactly one row with one `INT64` column.
  When the query matches no rows the value is treated as `0` (not an error), so
  both `COUNT(*)` aggregates and single-value `SELECT` statements work correctly.
- `targetValue` - The value of the metric per replica. KEDA and the HPA use
  `ceil(currentValue / targetValue)` to compute the desired replica count.
  (Default: `5`, Optional)
- `activationValue` - Minimum metric value required to activate the scaler.
  While `currentValue ≤ activationValue` the scaler is considered inactive and
  the deployment is held at 0 replicas.
  Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).
  (Default: `0`, Optional)
- `credentialsFromEnv` - Name of an environment variable on the scale target
  that contains the service-account JSON.
- `credentialsFromEnvFile` - Name of an environment variable on the scale target
  whose value is a *path* to a JSON key file.

The metric name is generated automatically from the trigger index and the
resource identifiers, for example:
**`s0-gcp-spanner-<instanceId>-<databaseId>-<projectId>`**.

### Authentication Parameters

You can use a `TriggerAuthentication` CRD to supply credentials outside of the
scale-target environment.

**Credential-based authentication (service account JSON):**

- `GoogleApplicationCredentials` - Service account credentials in JSON.

**Identity-based authentication (Workload Identity / GKE metadata server):**

Create a `TriggerAuthentication` with `podIdentity.provider: gcp` and reference
it from the `ScaledObject`. No JSON key is required.

### Examples

#### Inline credentials via environment variable

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: spanner-scaledobject
  namespace: my-namespace
spec:
  scaleTargetRef:
    name: job-processor
  pollingInterval: 15
  cooldownPeriod: 30
  minReplicaCount: 0
  maxReplicaCount: 10
  triggers:
    - type: gcp-spanner
      metadata:
        projectId: my-gcp-project
        instanceId: my-spanner-instance
        databaseId: my-database
        query: "SELECT COUNT(*) FROM jobs WHERE status = 'pending'"
        targetValue: "5"
        activationValue: "2"
        credentialsFromEnv: GOOGLE_APPLICATION_CREDENTIALS_JSON
```

#### Using TriggerAuthentication with a Kubernetes Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: spanner-secret
  namespace: my-namespace
stringData:
  creds.json: |
    { "type": "service_account", ... }
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-gcp-spanner
  namespace: my-namespace
spec:
  secretTargetRef:
    - parameter: GoogleApplicationCredentials
      name: spanner-secret
      key: creds.json
---
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
      authenticationRef:
        name: keda-trigger-auth-gcp-spanner
      metadata:
        projectId: my-gcp-project
        instanceId: my-spanner-instance
        databaseId: my-database
        query: "SELECT COUNT(*) FROM jobs WHERE status = 'pending'"
        targetValue: "5"
        activationValue: "2"
```

#### Using TriggerAuthentication with GCP Workload Identity

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-gcp-spanner
  namespace: my-namespace
spec:
  podIdentity:
    provider: gcp
---
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
      authenticationRef:
        name: keda-trigger-auth-gcp-spanner
      metadata:
        projectId: my-gcp-project
        instanceId: my-spanner-instance
        databaseId: my-database
        query: "SELECT COUNT(*) FROM jobs WHERE status = 'pending'"
        targetValue: "5"
```
