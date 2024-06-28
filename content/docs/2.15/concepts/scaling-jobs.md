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


# Pausing autoscaling

It can be useful to instruct KEDA to pause the autoscaling of objects, to do to cluster maintenance or to avoid resource starvation by removing non-mission-critical workloads.

This is preferable to deleting the resource because it removes the instances it is running from operation without touching the applications themselves. When ready, you can then reenable scaling.

You can pause autoscaling by adding this annotation to your `ScaledJob` definition:

```yaml
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
