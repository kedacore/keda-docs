+++
title = "Scaling Jobs"
weight = 300
+++


## Overview

As an alternate to [scaling event-driven code as deployments](../scaling-deployments) you can also run and scale your code as Kubernetes Jobs.  The primary reason to consider this option is to handle processing long-running executions.  Rather than processing multiple events within a deployment, for each detected event a single Kubernetes Job is scheduled.  That job will initialize, pull a single event from the message source, and process to completion and terminate.

For example, if you wanted to use KEDA to run a job for each message that lands on a RabbitMQ queue, the flow may be:

1. When no messages are awaiting processing, no jobs are created.
1. When a message arrives on the queue, KEDA creates a job.
1. When the job starts running, it pulls *a single* message and processes it to completion.
1. As additional messages arrive, additional jobs are created.  Each job processes a single message to completion.
1. Periodically remove completed/failed job by the `SuccessfulJobsHistoryLimit` and `FailedJobsHistoryLimit.`

## ScaledJob spec

This specification describes the `ScaledJob` custom resource definition which is used to define how KEDA should scale your application and what the triggers are.

[`scaledjob_types.go`](https://github.com/kedacore/keda/blob/main/apis/keda/v1alpha1/scaledjob_types.go)

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata:
  name: {scaled-job-name}
spec:
  jobTargetRef:
    parallelism: 1                            # [max number of desired pods](https://kubernetes.io/docs/concepts/workloads/controllers/job/#controlling-parallelism)
    completions: 1                            # [desired number of successfully finished pods](https://kubernetes.io/docs/concepts/workloads/controllers/job/#controlling-parallelism)
    activeDeadlineSeconds: 600                #  Specifies the duration in seconds relative to the startTime that the job may be active before the system tries to terminate it; value must be positive integer
    backoffLimit: 6                           # Specifies the number of retries before marking this job failed. Defaults to 6
    template:
      # describes the [job template](https://kubernetes.io/docs/concepts/workloads/controllers/job)
  pollingInterval: 30                         # Optional. Default: 30 seconds
  successfulJobsHistoryLimit: 5               # Optional. Default: 100. How many completed jobs should be kept.
  failedJobsHistoryLimit: 5                   # Optional. Default: 100. How many failed jobs should be kept.
  envSourceContainerName: {container-name}    # Optional. Default: .spec.JobTargetRef.template.spec.containers[0]
  maxReplicaCount: 100                        # Optional. Default: 100
  scalingStrategy:
    strategy: "custom"                        # Optional. Default: default. Which Scaling Strategy to use. 
    customScalingQueueLengthDeduction: 1      # Optional. A parameter to optimize custom ScalingStrategy.
    customScalingRunningJobPercentage: "0.5"  # Optional. A parameter to optimize custom ScalingStrategy.
  triggers:
  # {list of triggers to create jobs}
```

You can find all supported triggers [here](../scalers).

## Details

```yaml
  jobTargetRef:
    parallelism: 1              # Max number of desired instances ([docs](https://kubernetes.io/docs/concepts/workloads/controllers/job/#controlling-parallelism))
    completions: 1              # Desired number of successfully finished instances ([docs](https://kubernetes.io/docs/concepts/workloads/controllers/job/#controlling-parallelism))
    activeDeadlineSeconds: 600  # Specifies the duration in seconds relative to the startTime that the job may be active before the system tries to terminate it; value must be positive integer
    backoffLimit: 6             # Specifies the number of retries before marking this job failed. Defaults to 6
```

---

```yaml
  pollingInterval: 30  # Optional. Default: 30 seconds
```

This is the interval to check each trigger on. By default, KEDA will check each trigger source on every ScaledJob every 30 seconds.

---

```yaml
  successfulJobsHistoryLimit: 5  # Optional. Default: 100. How many completed jobs should be kept.
  failedJobsHistoryLimit: 5      # Optional. Default: 100. How many failed jobs should be kept.
```

The `successfulJobsHistoryLimit` and `failedJobsHistoryLimit` fields are optional. These fields specify how many completed and failed jobs should be kept. By default, they are set to 100.

This concept is similar to [Jobs History Limits](https://kubernetes.io/docs/tasks/job/automated-tasks-with-cron-jobs/#jobs-history-limits) allowing you to learn what the outcomes of your jobs are.

The actual number of jobs could exceed the limit in a short time. However, it is going to resolve in the cleanup period. Currently, the cleanup period is the same as the Polling interval.

---


```yaml
  envSourceContainerName: {container-name}  # Optional. Default: .spec.JobTargetRef.template.spec.containers[0]
```

This optional property specifies the name of container in the Job, from which KEDA should try to get environment properties holding secrets etc. If it is not defined it, KEDA will try to get environment properties from the first Container, ie. from `.spec.JobTargetRef.template.spec.containers[0]`.

---

```yaml
  maxReplicaCount: 100 # Optional. Default: 100
```

The max number of pods that is created within a single polling period. If there are running jobs, the number of running jobs will be deducted. This table is an example of the scaling logic.

| Queue Length | Max Replica Count | Target Average Value | Running Job Count | Number of the Scale |
| ------- | ------ | ------- | ------ | ----- |
| 10 | 3 | 1 | 0 | 3 |
| 10 | 3 | 2 | 0 | 3 |
| 10 | 3 | 1 | 1 | 2 |
| 10 | 100 | 1 | 0 | 10 | 
| 4 | 3 | 5 | 0 | 1 |

* **Queue Length:** The number of items in the queue.
* **Target Average Value:** The number of messages that will be consumed on a job. It is defined on the scaler side. e.g. `queueLength` on `Azure Storage Queue` scaler.
* **Running Job Count:** How many jobs are running.
* **Number of the Scale:** The number of the job that is created.

---

```yaml
scalingStrategy:
  strategy: "default"                 # Optional. Default: default. Which Scaling Strategy to use. 
```

Select a Scaling Strategy. Possible values are `default`, `custom`, or `accurate`. The default value is `default`.

> 💡 **NOTE:**
>
>`maxScale` is not the running Job count. It is measured as follows:
 >```go
 >maxValue = min(scaledJob.MaxReplicaCount(), divideWithCeil(queueLength, targetAverageValue))
 >```
 >That means it will use the value of `queueLength` divided by `targetAvarageValue` unless it is exceeding the `MaxReplicaCount`.
>
>`RunningJobCount` represents the number of jobs that are currently running or have not finished yet.
>
>It is measured as follows:
>```go
>if !e.isJobFinished(&job) {
>		runningJobs++
>}
>```
>`PendingJobCount` provides an indication of the amount of jobs that are in pending state, for example a that has not finished yet **and** the underlying pod is either not running or has not completed yet.
>
>It is measured as follows:
>```go
>if !e.isJobFinished(&job) && !e.isAnyPodRunningOrCompleted(&job) {
>			pendingJobs++
>}
>```

**default**
This logic is the same as Job for V1.  The number of the scale will be calculated as follows. 

_The number of the scale_

```go
maxScale - runningJobCount
```

**custom**
You can customize the default scale logic. You need to configure the following parameters. If you don't configure it, then the strategy will be `default.`

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

# Sample

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
        - name: rabbitmq-client
          image: tsuyoshiushio/rabbitmq-client:dev3
          imagePullPolicy: Always
          command: ["receive",  "amqp://user:PASSWORD@rabbitmq.default.svc.cluster.local:5672", "job"]
          envFrom:
            - secretRef:
                name: rabbitmq-consumer
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

