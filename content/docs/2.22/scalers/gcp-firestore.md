+++
title = "Google Cloud Platform Firestore"
availability = "v2.22+"
maintainer = "Community"
category = "Data & Storage"
description = "Scale applications based on the number of documents in a Google Cloud Firestore collection."
go_file = "gcp_firestore_scaler"
+++

### Trigger Specification

This specification describes the `gcp-firestore` trigger for [Google Cloud Firestore](https://cloud.google.com/firestore) in Native mode. It scales a workload on the number of documents in a collection, optionally limited by one filter on a field. This scaler assumes the worker, when run, will process the documents, for example by deleting them or by changing the field that the filter selects.

```yaml
triggers:
- type: gcp-firestore
  metadata:
    projectId: my-gcp-project          # Required
    collection: jobs                   # Required
    databaseId: "(default)"            # Optional - Default: (default)
    filterField: status                # Optional
    filterOperator: "=="               # Optional - Default: ==, used only with filterField
    filterValue: pending               # Required when filterField is set
    filterValueType: string            # Optional - Default: string
    targetValue: "5"                   # Optional - Default: 5
    activationValue: "0"               # Optional - Default: 0
    credentialsFromEnv: GOOGLE_APPLICATION_CREDENTIALS_JSON  # Optional
```

**Parameter list:**

- `projectId` - The GCP project that owns the Firestore database.
- `collection` - The collection to count, as a collection ID (`jobs`) or as the path of a subcollection (`users/alice/jobs`). The path must have an odd number of segments, and a segment cannot be empty, `.`, `..`, or begin and end with `__`.
- `databaseId` - The Firestore database ID. (Default: `(default)`, Optional)
- `filterField` - The field the filter applies to. A nested field is written with dots (`address.city`). Without it, every document of the collection is counted. (Optional)
- `filterOperator` - How the field is compared with `filterValue`. It can be set only together with `filterField`. The `!=` operator does not count documents that lack the field or hold `null` in it. The operators that take a list of values (`in`, `not-in` and `array-contains-any`) are not supported. (Values: `==`, `!=`, `<`, `<=`, `>`, `>=`, `array-contains`, Default: `==`, Optional)
- `filterValue` - The value the field is compared with. It must not be empty, and surrounding spaces are removed. It can be set only together with `filterField`. (Required when `filterField` is set)
- `filterValueType` - How `filterValue` is read: `int` is a base 10 integer, `float` is a decimal number (`NaN` only with `==` and `!=`) and `bool` is `true` or `false`. With `==`, a field that holds the number `3` does not match the string `"3"`. Fields of other types, such as `null` or timestamps, cannot be filtered. (Values: `string`, `int`, `float`, `bool`, Default: `string`, Optional)
- `targetValue` - Average target value to trigger scaling actions. Must be greater than `0`. (Default: `5`, Optional)
- `activationValue` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)

The metric is the number of documents that the collection holds, or that the filter selects. A collection with no document gives `0`. The scaler asks Firestore for the count only ([aggregation query](https://cloud.google.com/firestore/native/docs/query-data/aggregation-queries)), so it does not read the documents.

Firestore bills one read operation for each batch of up to 1000 index entries that the query matches, and an aggregation query that cannot finish within 60 seconds fails with `DEADLINE_EXCEEDED`. The scaler itself stops waiting after 30 seconds and reports an error for that poll. Both grow with the number of documents that the query matches, so the polling interval and the size of the collection are worth a look together. In a Standard edition database with automatic indexing, a filter on one field uses the automatic single-field indexes of Firestore and needs no index of its own, unless the field has an indexing exemption.

A trigger counts the documents of one collection with at most one filter. The filters of several triggers are not combined: by default the HPA uses the highest replica count that any trigger asks for.

The metric name will be generated automatically based on the trigger index and the resource identifiers, for example: **s0-gcp-firestore-projectId-databaseId-collection**. For the default database the name has `default` in place of `(default)`, and each `/` of a collection path becomes `-`.

You can provide in the metadata either `credentialsFromEnv` or `credentialsFromEnvFile`.
- `credentialsFromEnv` - Set to the name of the environment variable that holds the credential information. (Optional)
- `credentialsFromEnvFile` - Set to the name of the environment variable that holds the path of a json file with the credential information. (Optional)

### Authentication Parameters

Whichever way you authenticate, the service account needs the permissions `datastore.entities.get` and `datastore.entities.list`, which the predefined role `roles/datastore.viewer` includes, and the Cloud Firestore API (`firestore.googleapis.com`) must be enabled in the project.

You can use `TriggerAuthentication` CRD to configure the authentication by providing the service account credentials in JSON.

**Credential based authentication:**

- `GoogleApplicationCredentials` - Service account credentials in JSON.

**Identity based authentication:**

You can also use `TriggerAuthentication` CRD to configure the authentication using the associated service account of the running machine in Google Cloud. You only need to create a `TriggerAuthentication` as this example, and reference it in the `ScaledObject`. `ClusterTriggerAuthentication` can also be used if you intend to use it globally in your cluster.

### Examples

Count the documents of the `jobs` collection whose `status` is `pending`:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: firestore-scaledobject
  namespace: my-namespace
spec:
  scaleTargetRef:
    name: job-processor
  triggers:
  - type: gcp-firestore
    metadata:
      projectId: my-gcp-project
      collection: jobs
      filterField: status
      filterValue: pending
      targetValue: "5"
      credentialsFromEnv: GOOGLE_APPLICATION_CREDENTIALS_JSON
```

Count the documents of a named database whose `priority` is 3 or more (a number, so the value type is set):

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: firestore-priority-scaledobject
  namespace: my-namespace
spec:
  scaleTargetRef:
    name: job-processor
  triggers:
  - type: gcp-firestore
    metadata:
      projectId: my-gcp-project
      databaseId: orders
      collection: jobs
      filterField: priority
      filterOperator: ">="
      filterValue: "3"
      filterValueType: int
      targetValue: "10"
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
    name: gcp-firestore-secret      # Required. Refers to the name of the secret
    key: GOOGLE_APPLICATION_CREDENTIALS_JSON       # Required.
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: firestore-scaledobject
spec:
  scaleTargetRef:
    name: job-processor
  triggers:
  - type: gcp-firestore
    authenticationRef:
      name: keda-trigger-auth-gcp-credentials
    metadata:
      projectId: my-gcp-project
      collection: jobs
      filterField: status
      filterValue: pending
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
  name: firestore-scaledobject
spec:
  scaleTargetRef:
    name: job-processor
  triggers:
  - type: gcp-firestore
    authenticationRef:
      name: keda-trigger-auth-gcp-credentials
    metadata:
      projectId: my-gcp-project
      collection: jobs
      filterField: status
      filterValue: pending
      targetValue: "5"
```
