+++
title = "Google Cloud deprecations"
date = 2025-08-15
author = "KEDA Maintainers"
aliases = [
"/blog/gcp-deprecations"
]
+++

One year ago, Google Cloud deprecated its [Monitoring Query Language](https://cloud.google.com/monitoring/mql) in favor of a PromQL-based API:

> Announcement: Starting on October 22, 2024, Monitoring Query Language (MQL) will no longer be a recommended query language for Cloud Monitoring. Certain usability features will be disabled, but you can still run MQL queries in Metrics Explorer, and dashboards and alerting policies that use MQL will continue to work. For more information, see the [deprecation notice for MQL](https://cloud.google.com/stackdriver/docs/deprecations/mql).


Although the deprecation announcement also says that "***MQL is not being shut down**. You will still be able to create and run MQL queries, and dashboards and alerting policies that use MQL queries will continue to work.*"
we have decided to deprecate our current GCP scalers which rely on MQL ("[Cloud Tasks](https://keda.sh/docs/latest/scalers/gcp-cloud-tasks/)", "[Pub/Sub](https://keda.sh/docs/latest/scalers/gcp-pub-sub/)" and "[Stackdriver](https://keda.sh/docs/latest/scalers/gcp-stackdriver/)") keeping those that don't rely on MQL but use other SDKs, untouched (currently only "[Storage](https://keda.sh/docs/latest/scalers/gcp-storage/)" remains supported).

Does this mean KEDA no longer supports Google Cloud Platform? Absolutely not! We are committed to making the autoscaling dead simple on any vendor! In this case, we suggest moving the current deprecated scalers to [Prometheus scaler](https://keda.sh/docs/latest/scalers/prometheus/) for GCP.

> **Note**: GCP exposes the metrics via Prometheus endpoints without any extra configuration or services; you don't need to deploy anything else to get these metrics via Prometheus.

**We don't plan to remove these affected scalers as long as GCP supports MQL** but we strongly encourage migrating to a Prometheus-like approach to avoid service disruptions in case of any change on GCP.

## How to migrate

The migration path differs slightly depending on the scaler, but these are some examples:

### Migrate Google Cloud Platform Cloud Tasks

From the current trigger spec:
- `projectID` is not included as part of `serverAddress` value (`https://monitoring.googleapis.com/v1/projects/{{projectID}}/location/global/prometheus`).
- `value` and `activationValue` are replaced by `threshold` and `activationThreshold`.
- `queueName` is now included as part of `query` value (`{"__name__"="cloudtasks.googleapis.com/queue/depth","monitored_resource"="cloud_tasks_queue","queue_id"="{{queueName}}"}`).
- `GoogleApplicationCredentials`, `credentialsFromEnv`, `credentialsFromEnvFile` don't change.

For example, these scalers are equivalent:
```yaml
- type: gcp-cloudtasks
  metadata:
    projectID: "my-keda-project"
    queueName: "consumer-queue"
    value: "5"
    activationValue: "0"
    credentialsFromEnv: GOOGLE_APPLICATION_CREDENTIALS_JSON
```

```yaml
- type: prometheus
  metadata:
    serverAddress: https://monitoring.googleapis.com/v1/projects/my-keda-project/location/global/prometheus
    query: '{"__name__"="cloudtasks.googleapis.com/queue/depth","monitored_resource"="cloud_tasks_queue","queue_id"="consumer-queue"}'
    threshold: "5"
    activationThreshold: "0"
    credentialsFromEnv: GOOGLE_APPLICATION_CREDENTIALS_JSON
```

### Migrate Google Cloud Platform Stackdriver

From the current trigger spec:
- `projectID` is not included as part of `serverAddress` value (`https://monitoring.googleapis.com/v1/projects/{{projectID}}/location/global/prometheus`).
- `targetValue ` and `activationTargetValue` are replaced by `threshold` and `activationThreshold`.
- `filter` is replaced by `query`.
- `alignmentPeriodSeconds` is now included as part of `query` value.
- `alignmentAligner` is now included as part of `query` value.
- `GoogleApplicationCredentials`, `credentialsFromEnv`, `credentialsFromEnvFile` don't change.


For example, these scalers are equivalent:
```yaml
- type: gcp-stackdriver
  metadata:
    projectId: "my-keda-project"
    filter: 'metric.type="pubsub.googleapis.com/topic/num_unacked_messages_by_region" AND resource.type="pubsub_topic" AND resource.label.topic_id="my-keda-topic"'
    targetValue: "5"
    activationTargetValue: "0"
    alignmentPeriodSeconds: "60"
    alignmentAligner: max
    credentialsFromEnv: GOOGLE_APPLICATION_CREDENTIALS_JSON
```

```yaml
- type: prometheus
  metadata:
    serverAddress: https://monitoring.googleapis.com/v1/projects/my-keda-project/location/global/prometheus
    query: 'max(max_over_time({"__name__"="pubsub.googleapis.com/topic/num_unacked_messages_by_region","monitored_resource"="pubsub_topic","topic_id"="my-keda-topic"}[1m]))'
    threshold: "5"
    activationThreshold: "0"
    credentialsFromEnv: GOOGLE_APPLICATION_CREDENTIALS_JSON
```

### Migrate Google Cloud Platform Pub/Sub

From the current trigger spec:
- `value ` and `activationValue` are replaced by `threshold` and `activationThreshold`.
- `topicName` and `subscriptionName` are now included as part of `query` value.
- `aggregation` is now included as part of `query` value.
- `mode` is now included as part of `query` value.
- `GoogleApplicationCredentials`, `credentialsFromEnv`, `credentialsFromEnvFile` don't change.


For example, these scalers are equivalent:
```yaml
- type: gcp-pubsub
  metadata:
    topicName: my-topic
    mode: MessageSizes
    aggregation: count
    value: "5"
    activationValue: "0"
    credentialsFromEnv: GOOGLE_APPLICATION_CREDENTIALS_JSON
```

```yaml
- type: prometheus
  metadata:
    serverAddress: https://monitoring.googleapis.com/v1/projects/my-keda-project/location/global/prometheus
    query: 'count(increase({"__name__"="pubsub.googleapis.com:topic_message_sizes","monitored_resource"="pubsub_topic","topic_id"="my-topic"}[1m]))'
    threshold: "5"
    activationThreshold: "0"
    credentialsFromEnv: GOOGLE_APPLICATION_CREDENTIALS_JSON
```

KEDA maintainers.
