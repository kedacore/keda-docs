+++
title = "Scaling Jobs"
weight = 300
+++

This page describes the job scaling behavior of KEDA. See the [Scaled Job specification](../reference/scaledjob-spec.md) for details on how to set the behaviors described below.


# Overview

As an alternate to [scaling event-driven code as deployments](./scaling-deployments) you can also run and scale your code as Kubernetes Jobs.  The primary reason to consider this option is to handle processing long-running executions.  Rather than processing multiple events within a deployment, for each detected event a single Kubernetes Job is scheduled.  That job will initialize, pull a single event from the message source, and process to completion and terminate.

For example, if you wanted to use KEDA to run a job for each message that lands on a RabbitMQ queue, the flow may be:

1. When no messages are awaiting processing, no jobs are created.
1. When a message arrives at the queue, KEDA creates a job.
1. When the job starts running, it pulls *a single* message and processes it to completion.
1. As additional messages arrive, additional jobs are created.  Each job processes a single message to completion.
1. Periodically remove completed/failed job by the `SuccessfulJobsHistoryLimit` and `FailedJobsHistoryLimit.`

Select a Scaling Strategy. Possible values are `default`, `custom`, `accurate`, or `eager`. The default value is `default`.

```yaml
customScalingQueueLengthDeduction: 1      # Optional. A parameter to optimize custom ScalingStrategy.
customScalingRunningJobPercentage: "0.5"  # Optional. A parameter to optimize custom ScalingStrategy.
```

_The number of the scale_

```go
min(maxScale-int64(*s.CustomScalingQueueLengthDeduction)-int64(float64(runningJobCount)*(*s.CustomScalingRunningJobPercentage)), maxReplicaCount)
```

**accurate** 
If the scaler returns `queueLength` (number of items in the queue) that does not include the number of locked messages, this strategy is recommended. `Azure Storage Queue` is one example. You can use this strategy if you delete a message once your app consumes it.

```go
if (maxScale + runningJobCount) > maxReplicaCount {
		return maxReplicaCount - runningJobCount
	}
	return maxScale - pendingJobCount
```
For more details,  you can refer to [this PR](https://github.com/kedacore/keda/pull/1227).

**eager**
When adopting the **default** strategy, you are likely to come into a subtle case where messages need to be consumed by spawning jobs but remain in the queue, even when there are available slots between `runningJobCount` and `maxReplicaCount`. The **eager** strategy comes to the rescue. It addresses this issue by utilizing all available slots up to the maxReplicaCount, ensuring that waiting messages are processed as quickly as possible.

For example, let's assume we configure a ScaledJob in a cluster as below:
```yaml
  ###
  # A job that runs for a minimum of 3 hours.
  ###
  pollingInterval: 10 # Optional. Default: 30 seconds
  maxReplicaCount: 10 # Optional. Default: 100
  triggers:
    - type: rabbitmq
      metadata:
        queueName: woker_queue
        hostFromEnv: RABBITMQ_URL
        mode: QueueLength
        value: "1"
```
We send 3 messages to the Rabbitmq and wait longer enough than the `pollingInterval`, then send another 3.

With the `default` scaling strategy, we are supposed to see the metrics changes in the following table:

|             | initial | incoming 3 messages | after poll | incoming 3 messages | after poll |
|-------------|---------|---------------------|------------|---------------------|------------|
| queueLength | 0       | 3                   | 3          | 6                   | 6          |
| runningJobs | 0       | 0                   | 3          | 3                   | 3          |


If we switch to `eager`, the result becomes: 

|             | initial | incoming 3 messages | after poll | incoming 3 messages | after poll |
|-------------|---------|---------------------|------------|---------------------|------------|
| queueLength | 0       | 3                   | 3          | 6                   | 6          |
| runningJobs | 0       | 0                   | 3          | 3                   | 6          |

We can identify the difference in their final states.


You may also refer to [this original issue](https://github.com/kedacore/keda/issues/5114) for more information.

# Pausing autoscaling

It can be useful to instruct KEDA to pause the autoscaling of objects, to do to cluster maintenance or to avoid resource starvation by removing non-mission-critical workloads.

This is preferable to deleting the resource because it removes the instances it is running from operation without touching the applications themselves. When ready, you can then reenable scaling.

You can pause autoscaling by adding this annotation to your `ScaledJob` definition:

```yaml
scalingStrategy:
    multipleScalersCalculation : "max" # Optional. Default: max. Specifies how to calculate the target metrics (`queueLength` and `maxScale`) when multiple scalers are defined.
=======
metadata:
  annotations:
    autoscaling.keda.sh/paused: true
```

To reenable autoscaling, remove the annotation from the `ScaledJob` definition or set the value to `false`.

```yaml
metadata:
  annotations:
    autoscaling.keda.sh/paused: false
```

## Example

An example configuration for autoscaling jobs using a RabbitMQ scaler is given below. 

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: rabbitmq-consumer
data:
  RabbitMqHost: <omitted>
---
apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata:
  name: rabbitmq-consumer
  namespace: default
spec:
  jobTargetRef:
    template:
      spec:
        containers:
        - name: demo-rabbitmq-client
          image: demo-rabbitmq-client:1
          imagePullPolicy: Always
          command: ["receive",  "amqp://user:PASSWORD@rabbitmq.default.svc.cluster.local:5672"]
          envFrom:
            - secretRef:
                name: rabbitmq-consumer-secrets
        restartPolicy: Never
    backoffLimit: 4  
  pollingInterval: 10             # Optional. Default: 30 seconds
  maxReplicaCount: 30             # Optional. Default: 100
  successfulJobsHistoryLimit: 3   # Optional. Default: 100. How many completed jobs should be kept.
  failedJobsHistoryLimit: 2       # Optional. Default: 100. How many failed jobs should be kept.
  scalingStrategy:
    strategy: "custom"                        # Optional. Default: default. Which Scaling Strategy to use.
    customScalingQueueLengthDeduction: 1      # Optional. A parameter to optimize custom ScalingStrategy.
    customScalingRunningJobPercentage: "0.5"  # Optional. A parameter to optimize custom ScalingStrategy.
  triggers:
  - type: rabbitmq
    metadata:
      queueName: hello
      host: RabbitMqHost
      queueLength  : '5'
```
