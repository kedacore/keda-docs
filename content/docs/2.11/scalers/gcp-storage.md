+++
title = "Google Cloud Platform Storage"
availability = "2.7+"
maintainer = "Community"
description = "Scale applications based on the count of objects in a given Google Cloud Storage (GCS) bucket."
go_file = "gcp_storage_scaler"
+++

### Trigger Specification

This specification describes the `gcp-storage` scaler, which scales Kubernetes workloads based on the count of objects in a given Google Cloud Storage (GCS) bucket. This scaler assumes the worker, when run, will process and clear the bucket by deleting/moving objects therein.

```yaml
triggers:
- type: gcp-storage
  metadata:
    bucketName: test-bucket
    targetObjectCount: '100'
    activationTargetObjectCount: '10' # Optional
    maxBucketItemsToScan: '1000'
    credentialsFromEnv: GOOGLE_APPLICATION_CREDENTIALS_JSON # Optional
    credentialsFromEnvFile: GOOGLE_APPLICATION_CREDENTIALS_JSON # Optional
    blobPrefix:  # Optional. Prefix for the Blob. Use this to specify sub path for the blobs if required. Default : ""
    blobDelimiter: # Optional. Delimiter for identifying the blob Prefix. Default: ""
```

**Parameter list:**

- `bucketName` - Name of the bucket in GCS.
- `targetObjectCount` - Average target value to trigger scaling actions. (Default: `100`, Optional)
- `activationTargetObjectCount` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional)
- `maxBucketItemsToScan` - When to stop counting how many objects are in the bucket. (Default: `1000`, Optional)
- `blobPrefix` - Prefix for the Blob. Use this to specify sub path for the blobs if required. (Default: `""`, Optional)
- `blobDelimiter` - Delimiter for identifying the blob prefix. (Default: `""`, Optional)
As counting the number of objects involves iterating over their metadata it is advised to set this number to the value of `targetObjectCount` * `maxReplicaCount`.

The metric name will be generated automatically based on the trigger index and `bucketName`, for example: **s0-gcp-storage-bucketName**.

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
  name: gcp-storage-scaledobject
  namespace: keda-gcp-storage-test
spec:
  scaleTargetRef:
    name: keda-gcp-storage-go
  triggers:
  - type: gcp-storage
    metadata:
      bucketName: "Transactions"
      targetObjectCount: "5"
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
    name: gcp-storage-secret        # Required. Refers to the name of the secret
    key: GOOGLE_APPLICATION_CREDENTIALS_JSON       # Required.
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: gcp-storage-scaledobject
spec:
  scaleTargetRef:
    name: keda-gcp-storage-go
  triggers:
  - type: gcp-storage
    authenticationRef:
      name: keda-trigger-auth-gcp-credentials
    metadata:
      bucketName: "Transactions"
      targetObjectCount: "5"
      blobPrefix: blobsubpath # Default : ""
      blobDelimiter: "/" # Default: ""
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
  name: gcp-storage-scaledobject
spec:
  scaleTargetRef:
    name: keda-gcp-storage-go
  triggers:
  - type: gcp-storage
    authenticationRef:
      name: keda-trigger-auth-gcp-credentials
    metadata:
      bucketName: "Transactions"
      targetObjectCount: "5"
```
