+++
title = "Apache Iggy"
availability = "v2.20+"
maintainer = "Community"
category = "Messaging"
description = "Scale applications based on an Apache Iggy consumer group lag."
go_file = "apache_iggy_scaler"
+++

> **Notice:**
> - By default, the number of replicas will not exceed:
>   - The number of partitions on the topic;
>   - `maxReplicaCount` specified in `ScaledObject`/`ScaledJob`. If not specified, then the default value of `maxReplicaCount` is taken into account;
>   - The number of partitions with non-zero lag if `limitToPartitionsWithLag` is set to `true`
>
>   That is, if `maxReplicaCount` is set more than the number of partitions, the scaler won't scale up to target maxReplicaCount. See `allowIdleConsumers` below to disable this default behavior.
> - This is so because if there are more consumers than the number of partitions in a topic, then extra consumers will have to sit idle.
> - Apache Iggy partitions are **1-indexed** (unlike Kafka which is 0-indexed). Keep this in mind when using `partitionLimitation`.

### Trigger Specification

This specification describes the `apache-iggy` trigger that scales based on consumer group lag for an Apache Iggy topic.

```yaml
triggers:
- type: apache-iggy
  metadata:
    serverAddress: iggy-server.default.svc.cluster.local:8090
    streamId: my-stream
    topicId: my-topic
    consumerGroupId: my-group
    lagThreshold: '5'
    activationLagThreshold: '3'
    offsetResetPolicy: latest
    allowIdleConsumers: 'false'
    scaleToZeroOnInvalidOffset: 'false'
    excludePersistentLag: 'false'
    limitToPartitionsWithLag: 'false'
    ensureEvenDistributionOfPartitions: 'false'
    partitionLimitation: '1,2,10-20,31'
```

**Parameter list:**

- `serverAddress` - The TCP address of the Iggy server (e.g., `iggy-server.default.svc.cluster.local:8090`).
- `streamId` - Name or numeric ID of the Iggy stream.
- `topicId` - Name or numeric ID of the Iggy topic.
- `consumerGroupId` - Name or numeric ID of the consumer group used for checking the offset on the topic and processing the related lag.
- `lagThreshold` - Target value for the total lag (sum of all partition lags) to trigger scaling actions. (Default: `10`, Optional)
- `activationLagThreshold` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)
- `offsetResetPolicy` - The offset reset policy for the consumer. (Values: `latest`, `earliest`, Default: `latest`, Optional)
- `allowIdleConsumers` - When set to `true`, the number of replicas can exceed the number of partitions on a topic, allowing for idle consumers. Cannot be `true` when `limitToPartitionsWithLag` or `ensureEvenDistributionOfPartitions` is `true`. (Default: `false`, Optional)
- `scaleToZeroOnInvalidOffset` - This parameter controls what the scaler does when a partition doesn't have a valid offset. If `false` (the default), the scaler will keep a single consumer for that partition. If `true`, the consumers for that partition will be scaled to zero. (Default: `false`, Optional)
- `excludePersistentLag` - When set to `true`, the scaler will exclude partition lag for partitions whose current offset has not changed since the previous polling cycle. This parameter is useful to prevent scaling due to partitions whose current offset message is unable to be consumed. If `false` (the default), the scaler will include all consumer lag in all partitions as per normal. (Default: `false`, Optional)
- `limitToPartitionsWithLag` - When set to `true`, the number of replicas will not exceed the number of partitions having non-zero lag. `allowIdleConsumers` cannot be `true` when this parameter is `true`. (Default: `false`, Optional)
- `ensureEvenDistributionOfPartitions` - When set to `true`, the scaler will ensure that the number of replicas is a factor of the total partition count for balanced assignment. Cannot be `true` when `allowIdleConsumers` is `true`. (Default: `false`, Optional)
- `partitionLimitation` - Comma separated list of partition ids to scope the scaling on. Allowed patterns are `x,y` and/or ranges `x-y`. If set, the calculation of the lag will only take these ids into account. Note that Iggy partitions are **1-indexed**. (Default: All partitions, Optional)

### Authentication Parameters

You can use `TriggerAuthentication` CRD to configure the authentication. Apache Iggy supports two authentication methods: username/password and personal access token. You must provide exactly one of these methods.

**Username/Password authentication:**

- `username` - Username for authentication.
- `password` - Password for authentication.

**Personal Access Token authentication:**

- `accessToken` - Personal access token for authentication.

### New Consumers and Offset Reset Policy

When a new consumer group is created in Iggy, KEDA must determine how to handle the initial state where no offsets have been committed. The `offsetResetPolicy` parameter controls this behavior:

- If the policy is set to `earliest` (a new consumer wants to replay everything in the topic from its beginning) and no offset is committed, the scaler will return a lag value of 1 to ensure at least one replica is running (or 0 if `scaleToZeroOnInvalidOffset` is `true`).
- If the policy is set to `latest` (the new consumer will only consume new messages) and no offset is committed, the scaler will return a lag value of 1 to ensure the minimum number of replicas are running (or 0 if `scaleToZeroOnInvalidOffset` is `true`).

### The `ensureEvenDistributionOfPartitions` Property

When scaling consumers, you may want to ensure that all partitions are consumed equally. Without this parameter, the scaler does not factor in the number of partitions in its scaling decisions, which could lead to uneven partition distribution across consumers. When `ensureEvenDistributionOfPartitions` is enabled, the scaler ensures that the number of replicas is always a factor of the total partition count.

Consider for example a topic with `10` partitions. In this case the ideal consumer count should always be `1, 2, 5, 10`. Running any other number of consumers would cause an uneven distribution.

Below are some examples of what the scaling decision would look like. Consider `10` partitions and a lag threshold of `10` as the configuration default.

- For lag between `1 -> 10` we would be running `1` consumer
- For lag between `11 -> 20` we would be running `2` consumers
- For lag between `21 -> 50` we would be running `5` consumers
- For lag higher than `51` we would be running `10` consumers

### Example

#### Using username/password authentication:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-iggy-secrets
  namespace: default
data:
  username: aWdneQ==       # base64 encoded
  password: aWdneQ==       # base64 encoded
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-iggy-credential
  namespace: default
spec:
  secretTargetRef:
  - parameter: username
    name: keda-iggy-secrets
    key: username
  - parameter: password
    name: keda-iggy-secrets
    key: password
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: iggy-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: my-deployment
  pollingInterval: 30
  triggers:
  - type: apache-iggy
    metadata:
      serverAddress: iggy-server.default.svc.cluster.local:8090
      streamId: my-stream
      topicId: my-topic
      consumerGroupId: my-group
      # Optional
      lagThreshold: "50"
      offsetResetPolicy: latest
    authenticationRef:
      name: keda-trigger-auth-iggy-credential
```

#### Using personal access token authentication:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-iggy-secrets
  namespace: default
data:
  accessToken: bXktdG9rZW4=   # base64 encoded
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-iggy-credential
  namespace: default
spec:
  secretTargetRef:
  - parameter: accessToken
    name: keda-iggy-secrets
    key: accessToken
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: iggy-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: my-deployment
  pollingInterval: 30
  triggers:
  - type: apache-iggy
    metadata:
      serverAddress: iggy-server.default.svc.cluster.local:8090
      streamId: my-stream
      topicId: my-topic
      consumerGroupId: my-group
      # Optional
      lagThreshold: "50"
      offsetResetPolicy: latest
    authenticationRef:
      name: keda-trigger-auth-iggy-credential
```
