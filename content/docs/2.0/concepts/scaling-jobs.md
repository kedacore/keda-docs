+++
title = "Scaling Jobs"
weight = 300
+++


## Overview

As an alternate to [scaling event-driven code as deployments](../scaling-deployments) you can also run and scale your code as Kubernetes Jobs.  The primary reason to consider this option is to handle processing long running executions.  Rather than processing multiple events within a deployment, for each detected event a single Kubernetes Job is scheduled.  That job will initialize, pull a single event from the message source, and process to completion and terminate.

For example, if you wanted to use KEDA to run a job for each message that lands on a RabbitMQ queue, the flow may be:

1. When no messages are awaiting processing, no jobs are created.
1. When a message arrives on the queue, KEDA creates a job.
1. When the job starts running, it pulls *a single* message and processes it to completion.
1. As additional messages arrive, additional jobs are created.  Each job processes a single message to completion.
1. Periodically remove completed/failed job by the `SuccessfulJobsHistoryLimit` and `FailedJobsHistoryLimit.`

## ScaledJob spec

This specification describes the `ScaledJob` custom resource definition which is used to define how KEDA should scale your application and what the triggers are.

[`scaledobject_types.go`](https://github.com/kedacore/keda/blob/master/pkg/apis/keda/v1alpha1/scaledobject_types.go)

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata:
  name: {scaled-job-name}
spec:
  jobTargetRef:
    parallelism: 1 # [max number of desired pods](https://kubernetes.io/docs/concepts/workloads/controllers/jobs-run-to-completion/#controlling-parallelism)
    completions: 1 # [desired number of successfully finished pods](https://kubernetes.io/docs/concepts/workloads/controllers/jobs-run-to-completion/#controlling-parallelism)
    activeDeadlineSeconds: 600 # Specifies the duration in seconds relative to the startTime that the job may be active before the system tries to terminate it; value must be positive integer
    backoffLimit: 6 # Specifies the number of retries before marking this job failed. Defaults to 6
    template:
      # describes the [job template](https://kubernetes.io/docs/concepts/workloads/controllers/jobs-run-to-completion/)
  pollingInterval: 30  # Optional. Default: 30 seconds
  successfulJobsHistoryLimit: 5 # Optional. Default: 100. How many completed jobs should be kept.
  failedJobsHistoryLimit: 5 # Optional. Default: 100. How many failed jobs should be kept.
  maxReplicaCount: 100 # Optional. Default: 100
  triggers:
  # {list of triggers to create jobs}
```

You can find all supported triggers [here](../scalers).

## Details

```yaml
  jobTargetRef:
    parallelism: 1 # Max number of desired instances ([docs](https://kubernetes.io/docs/concepts/workloads/controllers/jobs-run-to-completion/#controlling-parallelism))
    completions: 1 # Desired number of successfully finished instances ([docs](https://kubernetes.io/docs/concepts/workloads/controllers/jobs-run-to-completion/#controlling-parallelism))
    activeDeadlineSeconds: 600 # Specifies the duration in seconds relative to the startTime that the job may be active before the system tries to terminate it; value must be positive integer
    backoffLimit: 6 # Specifies the number of retries before marking this job failed. Defaults to 6
```

The optional configuration parameter. Currently not implemented. It is going to be supported. 

```yaml
  pollingInterval: 30  # Optional. Default: 30 seconds
```

This is the interval to check each trigger on. By default, KEDA will check each trigger source on every ScaledJob every 30 seconds.


```yaml
  successfulJobsHistoryLimit: 5 # Optional. Default: 100. How many completed jobs should be kept.
  failedJobsHistoryLimit: 5 # Optional. Default: 100. How many failed jobs should be kept.
```

The `successfulJobsHistoryLimit` and `failedJobsHistoryLimit` fields are optional. These fields specify how many completed and failed jobs should be kept. By default, they are set to 100. This concept is similar to [Jobs Histry Limits](https://kubernetes.io/docs/tasks/job/automated-tasks-with-cron-jobs/#jobs-history-limits). The actual number of jobs could exceed the limit in a short time. However, it is going to resolve in the cleanup period. Currently, the cleanup period is the same as the Polling interval.

```yaml
  maxReplicaCount: 100 # Optional. Default: 100
```

The max number of pods that is created within a single polling period. If there are running jobs, the number of running jobs will be deducted. This table is an example of the scaling logic.

| Queue Length | maxReplicaCount | TargetAvarageValue | RunningJobCount | Number of the Scale |
| ------- | ------ | ------- | ------ | ----- |
| 10 | 3 | 1 | 0 | 3 |
| 10 | 3 | 2 | 0 | 3 |
| 10 | 3 | 1 | 1 | 2 |
| 10 | 100 | 1 | 0 | 10 | 
| 4 | 3 | 5 | 0 | 1 |

* **Queue Length:** The number of the length of the queue.
* **Target Average Value:** How many pods do they have in a Job.
* **Running Job Count:** How many jobs are running.
* **Number of the Scale:** The number of the job that is created.

# Sample


```yaml
apiVersion: v1
kind: Secret
metadata:
  name: rabbitmq-consumer
data:
  RabbitMqHost: <omitted>
  LocalHost: YW1xcDovL3VzZXI6UEFTU1dPUkRAMTI3LjAuMC4xOjU2NzI=
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
  pollingInterval: 10   # Optional. Default: 30 seconds
  maxReplicaCount: 30  # Optional. Default: 100
  successfulJobsHistoryLimit: 3 # Optional. Default: 100. How many completed jobs should be kept.
  failedJobsHistoryLimit: 2 # Optional. Default: 100. How many failed jobs should be kept.
  triggers:
  - type: rabbitmq
    metadata:
      queueName: hello
      host: RabbitMqHost
      localhost: LocalHost
      queueLength  : '5'
```
