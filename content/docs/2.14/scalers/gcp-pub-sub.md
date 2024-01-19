+++
title = "Google Cloud Platform‎ Pub/Sub"
availability = "v1.0+"
maintainer = "Community"
description = "Scale applications based on Google Cloud Platform‎ Pub/Sub."
go_file = "gcp_pubsub_scaler"
+++

### Trigger Specification

This specification describes the `gcp-pubsub` trigger for Google Cloud Platform‎ Pub/Sub.

```yaml
triggers:
- type: gcp-pubsub
  metadata:
    subscriptionSize: "5" # Deprecated, use mode and value fields instead
    mode: "SubscriptionSize" # Optional - Default is SubscriptionSize - SubscriptionSize or OldestUnackedMessageAge
    aggregation: "sum" # Optional - Only meaningful for distribution-valued metrics
    value: "5.5" # Optional - Default is 10
    activationValue: "10.5" # Optional - Default is 0
    # Either one of subscriptionName or topicName is required
    subscriptionName: "mysubscription"
    topicName: "mytopic"
    credentialsFromEnv: GOOGLE_APPLICATION_CREDENTIALS_JSON # Required
```

The Google Cloud Platform‎ (GCP) Pub/Sub trigger allows you to scale based on any metrics from your Pub/Sub subscription or topic, such as number of messages or oldest unacked message age, etc.

- `credentialsFromEnv` - This property maps to the name of an environment variable in the scale target (`scaleTargetRef`) that contains the service account credentials (JSON). KEDA will use those to connect to Google Cloud Platform and collect the required stack driver metrics in order to read the number of messages in the Pub/Sub subscription.

- `mode` - The metric used to scale your workload. It's the `PascalCase` of the official metric name. For example, if you are going to leverage the metric `subscription/pull_request_count`, you will fill the value as `PullRequestCount`. Please refer to https://cloud.google.com/monitoring/api/metrics_gcp#gcp-pubsub. All metrics starting with `subscription/` and `topic/` are supported. (Default: `SubscriptionSize`, aka `NumUndeliveredMessages`)

- `aggregation` - The aggregation function used to aggregate the metric. (Values: mean, median, variance, stddev, sum, count, percentileX (X: an integer in the range 0 to 100), Required for metrics with value type `DISTRIBUTION`)


- `activationValue` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional, This value can be a float)

- `subscriptionName` defines the subscription that should be monitored. You can use different formulas:
  - Just the subscription name, in which case you will reference a subscription from the current project or the one specified in the credentials file used.
  - Use the full link provided by Google, so that you can reference a subscription that is hosted in another project Eg: `projects/myproject/subscriptions/mysubscription`.

- `topicName` defines the topic that should be monitored. Similar to `susbcriptionName`, you can use different formulas:
  - Just the topic name, in which case you will reference a topic from the current project or the one specified in the credentials file used.
  - Use the full link provided by Google, so that you can reference a topic that is hosted in another project Eg: `projects/myproject/topics/mytopic`.

Here's an [example](https://github.com/kedacore/sample-go-gcppubsub).

### Authentication Parameters
You can use `TriggerAuthentication` CRD to configure the authenticate by providing the service account credentials in JSON.


**Credential based authentication:**

- `GoogleApplicationCredentials` - Service account credentials in JSON.

### Example

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: pubsub-scaledobject
  namespace: keda-pubsub-test
spec:
  scaleTargetRef:
    name: keda-pubsub-go
  triggers:
  - type: gcp-pubsub
    metadata:
      mode: "SubscriptionSize"
      value: "5"
      subscriptionName: "mysubscription" # Required
      credentialsFromEnv: GOOGLE_APPLICATION_CREDENTIALS_JSON # Required
```

### Example using distribution-valued metric and aggregation

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: pubsub-scaledobject
  namespace: keda-pubsub-test
spec:
  scaleTargetRef:
    name: keda-pubsub-go
  triggers:
  - type: gcp-pubsub
    metadata:
      # Example: https://cloud.google.com/pubsub/docs/monitoring#monitoring_message_throughput_2
      mode: "MessageSizes"
      aggregation: "count" # Calculate count of messages being published
      value: "50"
      topicName: "mytopic" # Required
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
    name: pubsub-secret        # Required. Refers to the name of the secret
    key: GOOGLE_APPLICATION_CREDENTIALS_JSON       # Required.
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: pubsub-scaledobject
spec:
  scaleTargetRef:
    name: keda-pubsub-go
  triggers:
  - type: gcp-pubsub
    authenticationRef:
      name: keda-trigger-auth-gcp-credentials
    metadata:
      subscriptionName: "input" # Required
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
  name: pubsub-scaledobject
spec:
  scaleTargetRef:
    name: keda-pubsub-go
  triggers:
  - type: gcp-pubsub
    authenticationRef:
      name: keda-trigger-auth-gcp-credentials
    metadata:
      subscriptionName: "input" # Required
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
  name: pubsub-scaledobject
spec:
  scaleTargetRef:
    name: keda-pubsub-go
  triggers:
  - type: gcp-pubsub
    authenticationRef:
      name: keda-clustertrigger-auth-gcp-credentials
      kind: ClusterTriggerAuthentication
    metadata:
      subscriptionName: "input" # Required
```
