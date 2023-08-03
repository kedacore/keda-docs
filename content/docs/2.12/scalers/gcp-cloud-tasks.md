+++
title = "Google Cloud Platform‎ Cloud Tasks"
availability = "v2.12+"
maintainer = "Community"
description = "Scale applications based on Google Cloud Platform‎ Cloud Tasks."
go_file = "gcp_cloud_tasks_scaler"
+++

### Trigger Specification

This specification describes the `gcp-cloudtasks` trigger for Google Cloud Platform‎ Cloud Tasks.

```yaml
triggers:
- type: gcp-cloudtasks
  metadata:
    value: "5" # Optional - Default is 100
    activationValue: "10.5" # Optional - Default is 0
    queueName: "myqueue" # Required
    projectID: "myproject" # Required, the project where the queue resides
    credentialsFromEnv: GOOGLE_APPLICATION_CREDENTIALS_JSON # Required
```

The Google Cloud Platform‎ (GCP) Cloud Tasks trigger allows you to scale based on the number of tasks queued in you queue.

The `credentialsFromEnv` property maps to the name of an environment variable in the scale target (`scaleTargetRef`) that contains the service account credentials (JSON). KEDA will use those to connect to Google Cloud Platform and collect the required stack driver metrics in order to read the number of messages in the Cloud Task queue.

- `activationValue` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional, This value can be a float)

- `queueName` defines the queue that should be monitored.

- `projectID` defines the GCP project where the queue that should be monitored resides.

### Authentication Parameters
You can use `TriggerAuthentication` CRD to configure the authenticate by providing the service account credentials in JSON.


**Credential based authentication:**

- `GoogleApplicationCredentials` - Service account credentials in JSON.

### Example

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: cloudtasks-scaledobject
  namespace: keda-cloudtasks-test
spec:
  scaleTargetRef:
    name: keda-cloudtasks-go
  triggers:
  - type: gcp-cloudtasks
    metadata:
      activationValue: "5"
      projectID: "myproject" # Required
      queueName: "myqueue" # Required
      credentialsFromEnv: GOOGLE_APPLICATION_CREDENTIALS_JSON # Required
```

### Example using TriggerAuthentication

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-gcp-credentials
spec:
  secretTargetRef:
  - parameter: GoogleApplicationCredentials
    name: cloudtasks-secret        # Required. Refers to the name of the secret
    key: GOOGLE_APPLICATION_CREDENTIALS_JSON       # Required.
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: cloudtasks-scaledobject
spec:
  scaleTargetRef:
    name: keda-cloudtasks-go
  triggers:
  - type: gcp-cloudtasks
    authenticationRef:
      name: keda-trigger-auth-gcp-credentials
    metadata:
      activationValue: "5"
      projectID: "myproject" # Required
      queueName: "myqueue" # Required
```

**Identity based authentication:**

You can also use `TriggerAuthentication` CRD to configure the authentication using the associated service account of the running machine in Google Cloud. You only need to create a `TriggerAuthentication` as this example, and reference it in the `ScaledObject`. `ClusterTriggerAuthentication` can also be used if you intend to use it globally in your cluster.

### Example using TriggerAuthentication with GCP Identity

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
  name: cloudtasks-scaledobject
spec:
  scaleTargetRef:
    name: keda-cloudtasks-go
  triggers:
  - type: gcp-cloudtasks
    authenticationRef:
      name: keda-trigger-auth-gcp-credentials
    metadata:
      activationValue: "5"
      projectID: "myproject" # Required
      queueName: "myqueue" # Required
```

## Example using ClusterTriggerAuthentication with GCP Identity

```yaml
apiVersion: keda.sh/v1alpha1
kind: ClusterTriggerAuthentication
metadata:
  name: keda-clustertrigger-auth-gcp-credentials
spec:
  podIdentity:
    provider: gcp
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: cloudtasks-scaledobject
spec:
  scaleTargetRef:
    name: keda-cloudtasks-go
  triggers:
  - type: gcp-cloudtasks
    authenticationRef:
      name: keda-clustertrigger-auth-gcp-credentials
      kind: ClusterTriggerAuthentication
    metadata:
      activationValue: "5"
      projectID: "myproject" # Required
      queueName: "myqueue" # Required
```
