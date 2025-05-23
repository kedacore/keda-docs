+++
title = "ScaledJob specification"
weight = 4000
+++

## Overview

This specification describes the `ScaledJob` custom resource definition that defines the triggers and scaling behaviors use by KEDA to scale jobs. The `.spec.ScaleTargetRef` section holds the reference to the job, defined in [_scaledjob_types.go_](https://github.com/kedacore/keda/blob/main/apis/keda/v1alpha1/scaledjob_types.go).

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata:
  name: {scaled-job-name}
  labels:
    my-label: {my-label-value}                # Optional. ScaledJob labels are applied to child Jobs
  annotations:
    autoscaling.keda.sh/paused: true          # Optional. Use to pause autoscaling of Jobs
    my-annotation: {my-annotation-value}      # Optional. ScaledJob annotations are applied to child Jobs
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
  minReplicaCount: 10                         # Optional. Default: 0
  maxReplicaCount: 100                        # Optional. Default: 100
  rolloutStrategy: gradual                    # Deprecated: Use rollout.strategy instead (see below).
  rollout:
    strategy: gradual                         # Optional. Default: default. Which Rollout Strategy KEDA will use.
    propagationPolicy: foreground             # Optional. Default: background. Kubernetes propagation policy for cleaning up existing jobs during rollout.
  scalingStrategy:
    strategy: "custom"                        # Optional. Default: default. Which Scaling Strategy to use. 
    customScalingQueueLengthDeduction: 1      # Optional. A parameter to optimize custom ScalingStrategy.
    customScalingRunningJobPercentage: "0.5"  # Optional. A parameter to optimize custom ScalingStrategy.
    pendingPodConditions:                     # Optional. A parameter to calculate pending job count per the specified pod conditions
      - "Ready"
      - "PodScheduled"
      - "AnyOtherCustomPodCondition"
    multipleScalersCalculation : "max" # Optional. Default: max. Specifies how to calculate the target metrics when multiple scalers are defined.
  triggers:
  # {list of triggers to create jobs}
```

You can find all supported triggers [here](../scalers).

## jobTargetRef

```yaml
  jobTargetRef:
    parallelism: 1              # Optional. Max number of desired instances ([docs](https://kubernetes.io/docs/concepts/workloads/controllers/job/#controlling-parallelism))
    completions: 1              # Optional. Desired number of successfully finished instances ([docs](https://kubernetes.io/docs/concepts/workloads/controllers/job/#controlling-parallelism))
    activeDeadlineSeconds: 600  # Optional. Specifies the duration in seconds relative to the startTime that the job may be active before the system tries to terminate it; value must be positive integer
    backoffLimit: 6             # Optional. Specifies the number of retries before marking this job failed. Defaults to 6
```

The `jobTargetRef` is a batch/v1 `JobSpec` object; refer to the Kubernetes API for [more details](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/job-v1/#JobSpec) about the fields. The `template` field is required.


## pollingInterval

```yaml
  pollingInterval: 30  # Optional. Default: 30 seconds
```

This is the interval to check each trigger on. By default, KEDA will check each trigger source on every ScaledJob every 30 seconds.


## successfulJobsHistoryLimit, failedJobsHistoryLimit

```yaml
  successfulJobsHistoryLimit: 5  # Optional. Default: 100. How many completed jobs should be kept.
  failedJobsHistoryLimit: 5      # Optional. Default: 100. How many failed jobs should be kept.
```

The `successfulJobsHistoryLimit` and `failedJobsHistoryLimit` fields are optional. These fields specify how many completed and failed jobs should be kept. By default, they are set to 100.

This concept is similar to [Jobs History Limits](https://kubernetes.io/docs/tasks/job/automated-tasks-with-cron-jobs/#jobs-history-limits) allowing you to learn what the outcomes of your jobs are.

The actual number of jobs could exceed the limit in a short time. However, it is going to resolve in the cleanup period. Currently, the cleanup period is the same as the Polling interval.


## envSourceContainerName

```yaml
  envSourceContainerName: {container-name}  # Optional. Default: .spec.JobTargetRef.template.spec.containers[0]
```

This optional property specifies the name of container in the Job, from which KEDA should try to get environment properties holding secrets etc. If it is not defined it, KEDA will try to get environment properties from the first Container, ie. from `.spec.JobTargetRef.template.spec.containers[0]`.

___
## minReplicaCount

```yaml
  minReplicaCount: 10 # Optional. Default: 0
```

The min number of jobs that is created by default. This can be useful to avoid bootstrapping time of new jobs. If minReplicaCount is greater than maxReplicaCount, minReplicaCount will be set to maxReplicaCount.  
  
New messages may create new jobs - within the limits imposed by maxReplicaCount - in order to reach the state where minReplicaCount jobs are always running.  For example, if one sets minReplicaCount to 2 then there will be 2 jobs running permanently. Using a targetValue of 1, if 3 new messages are sent, 2 of those messages will be processed on the already running jobs but another 3 jobs will be created in order to fulfill the desired state dictated by the minReplicaCount parameter that is set to 2.

## maxReplicaCount

```yaml
  maxReplicaCount: 100 # Optional. Default: 100
```

The max number of pods that is created within a single polling period. If there are running jobs, the number of running jobs will be deducted. This table is an example of the scaling logic.

| Queue Length | Max Replica Count | Target Average Value | Running Job Count | Number of the Scale |
|--------------|-------------------|----------------------|-------------------|---------------------|
| 10           | 3                 | 1                    | 0                 | 3                   |
| 10           | 3                 | 2                    | 0                 | 3                   |
| 10           | 3                 | 1                    | 1                 | 2                   |
| 10           | 100               | 1                    | 0                 | 10                  | 
| 4            | 3                 | 5                    | 0                 | 1                   |

* **Queue Length:** The number of items in the queue.
* **Target Average Value:** The number of messages that will be consumed on a job. It is defined on the scaler side. e.g. `queueLength` on `Azure Storage Queue` scaler.
* **Running Job Count:** How many jobs are running.
* **Number of the Scale:** The number of the job that is created.


## rollout

```yaml
  rollout:
    strategy: gradual                         # Optional. Default: default. Which Rollout Strategy KEDA will use.
    propagationPolicy: foreground             # Optional. Default: background. Kubernetes propagation policy for cleaning up existing jobs during 
```

The optional property rollout.strategy specifies the rollout strategy KEDA will use while updating an existing ScaledJob.
Possible values are `default` or `gradual`. \
When using the `default` rolloutStrategy, KEDA will terminate existing Jobs whenever a ScaledJob is being updated. Then, it will recreate those Jobs with the latest specs. The order in which this termination happens can be configured via the rollout.propagationPolicy property. By default, the kubernetes background propagation is used. To change this behavior specify set propagationPolicy to `foreground`. For further information see [Kubernetes Documentation](https://kubernetes.io/docs/tasks/administer-cluster/use-cascading-deletion/#use-foreground-cascading-deletion).
On the `gradual` rolloutStrategy, whenever a ScaledJob is being updated, KEDA will not delete existing Jobs. Only new Jobs will be created with the latest specs. 


## scalingStrategy
### Strategy
```yaml
scalingStrategy:
  strategy: "default"                 # Optional. Default: default. Which Scaling Strategy to use. 
```

Select a scaling strategy. Possible values are `default`, `accurate`, `eager`, or `custom`.

The scaling strategy modifies the raw value from the scaler to determine how many jobs to create on each poll, which is required for correct behavior.

For most use cases, where the scaler reports the number of outstanding jobs _including_ those in progress, the `default` scaling strategy is appropriate. 

For more details, see the following sections.

#### Background Explanation

The `ScaledJob` resource is designed to support the same scalers as [`ScaledObject`](./scaledobject-spec.md). However, the underlying mechanism must work differently.

When a `ScaledObject` controls a `Deployment`, the **Horizontal Pod Autoscaler** will manage the scaling from 1 to N replicas, using the metrics KEDA exposes from the scaler configuration. Because of this, in a workflow that uses a queue of jobs, the scaler will normally report the total number of jobs _including_ those that are currently in progress. If the metric did not include jobs in progress, then when the job is accepted from the queue (and the metric goes down), the **HPA** will reduce the `replicas` value of the `Deployment`, and those in progress pods would be terminated.

So when using a queue-based scaler (e.g. [**RabbitMQ**](../scalers/rabbitmq-queue.md)), the standard setup is as follows: each posted message represents an outstanding job, the queue length is used to scale, workers will accept messages and start working, and workers acknowledge messages (removing them from the queue) only when the job is done.

A `ScaledJob` setup is different, as there is no **HPA** involved, the jobs are created individually by KEDA. Once a job has been created there is no need to “sustain” it – it will run until it finishes.

This is where the **scaling strategy** comes in. This allows a `ScaledJob` to translate the value from the scaler into the required number of new jobs.

#### Scaling strategies

The scaling strategy currently imposes a _maximum_ on the number of new jobs created. _Note: support for strategies that increase the value is planned for a future version._

First the metric is calculated from the scalers: this starts with the `queueLength` modified by the scaler, accounts for multiple scalers (see [`multipleScalersCalculation`](#multiplescalerscalculation)), and then applies the [`maxReplicaCount`](#maxreplicacount).

```go
targetMetric := min(scalersMetric, maxReplicaCount)
```

(If a single simple scaler is used with no maximum, then `targetMetric := queueLength`)

Then the scaling strategy is applied to `targetMetric` as follows.


##### `default`

The default strategy would be appropriate for the RabbitMQ queue described above. On each poll, the `default` strategy will create jobs equal to:

```go
targetMetric - runningJobCount
```

For example: if there are 3 messages on the queue and 0 jobs running, then 3 jobs are created. 

On the next poll, if the queue length is still 3, and there are 3 jobs running, then no new jobs are created.

If 3 more jobs are submitted, making the queue length 6, and 3 jobs running, then 3 more jobs are created.

Once the first 3 jobs finish, the workers acknowledge the messages. The queue length drops to 3, as does the number of running workers. A poll now will create no new jobs, as expected.

##### `accurate`

The `accurate` strategy is designed for a scaler that returns the number of items in the queue _not including_ the number of running jobs. [Azure Storage Queue](../scalers/azure-storage-queue.md) is one example. 

You should also use this strategy if you delete/acknowledge a message as soon as you worker consumes it, rather than when work is done, when using a scaler like RabbitMQ.

For more details,  you can refer to [this PR](https://github.com/kedacore/keda/pull/1227).

The number of jobs created on each poll is calculated as follows:

```go
if (targetMetric + runningJobCount) > maxReplicaCount {
  return maxReplicaCount - runningJobCount
}
return targetMetric - pendingJobCount
```
  
As it can take some time for a Job to be created and consume the message from the queue, pending jobs need to be deducted from the queue length. Even still, it is possible that short polling times will lead to over-scaling.

By default, any unfinished jobs with pods that aren't running are considered pending. It is possible to customize this to include pod conditions by specifying `customPendingPodConditions`

```yaml
scalingStategy:
  strategy: "accurate"
  customPendingPodConditions: 
    - "Ready"
    - "PodScheduled"
    - "AnyOtherCustomPodCondition"
```

There are more details and explanation in the issue [here](https://github.com/kedacore/keda/issues/1963) and its linked PR.

##### `eager`

_Note: this documentation for this strategy did not match its behavior in previous versions. Its implementation may change in a future version. See the following [issue](https://github.com/kedacore/keda/issues/6416)._

If a scaler reports one or more jobs on the queue, the `eager` strategy will create new jobs until it hits the `maxReplicaCount`. 

This behavior might be desirable if your Jobs have a slow start-up time, and you want to create as many jobs as possible, e.g. on a GPU node which can scale down when there are zero jobs.

The number of jobs created on each poll is calculated as follows:
```go
min(maxReplicaCount-runningJobCount-pendingJobCount, targetMetric)
```


##### `custom`

The `custom` strategy allows you to customize the scale logic. You need to configure the following parameters, otherwise the strategy will be the same as `default`.

```yaml
customScalingQueueLengthDeduction: 1      # Optional. A parameter to optimize custom ScalingStrategy.
customScalingRunningJobPercentage: "0.5"  # Optional. A parameter to optimize custom ScalingStrategy.
```

The number of jobs created on each poll is calculated as follows:

```go
min(
  maxReplicaCount,
  (
     targetMetric 
   - customScalingQueueLengthDeduction 
   - (runningJobCount*customScalingRunningJobPercentage)
  )
)
```

### multipleScalersCalculation

```yaml
scalingStrategy:
    multipleScalersCalculation : "max" # Optional. Default: max. Specifies how to calculate the target metrics (`queueLength` and `maxScale`) when multiple scalers are defined.
```
Select a behavior if you have multiple triggers. Possible values are `max`, `min`, `avg`, or `sum`. The default value is `max`. 

* **max:** - Use metrics from the scaler that has the max number of `queueLength`. (default)
* **min:** - Use metrics from the scaler that has the min number of `queueLength`.
* **avg:** - Sum up all the active scalers metrics and divide by the number of active scalers.
* **sum:** - Sum up all the active scalers metrics.
