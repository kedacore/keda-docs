+++
title = "ScaledJob specification"
weight = 4000
+++

## Overview

This specification describes the `ScaledJob` custom resource definition that defines the triggers and scaling behaviors use by KEDA 

to scale jobs. The `.spec.ScaleTargetRef` section holds the reference to the job, defined in [_scaledjob_types.go_](https://github.com/kedacore/keda/blob/main/apis/keda/v1alpha1/scaledjob_types.go).

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
On the `gradual` rolloutStartegy, whenever a ScaledJob is being updated, KEDA will not delete existing Jobs. Only new Jobs will be created with the latest specs. 


## scalingStrategy

```yaml
scalingStrategy:
  strategy: "default"                 # Optional. Default: default. Which Scaling Strategy to use. 
```

Select a Scaling Strategy. Possible values are `default`, `custom`, or `accurate`. The default value is `default`.

> 💡 **NOTE:**
>
>`maxScale` is not the running Job count. It is measured as follows:
 >```go
 >maxScale = min(scaledJob.MaxReplicaCount(), divideWithCeil(queueLength, targetAverageValue))
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
>`PendingJobCount` provides an indication of the amount of jobs that are in pending state. Pending jobs can be calculated in two ways:
> - Default behavior - Job that have not finished yet **and** the underlying pod is either not running or has not been completed yet
> - Setting `pendingPodConditions` - Job that has not finished yet **and** all specified pod conditions of the underlying pod mark as `true` by kubernetes.
>
>It is measured as follows:
>```go
>if !e.isJobFinished(&job) {
>   if len(scaledJob.Spec.ScalingStrategy.PendingPodConditions) > 0 {
>       if !e.areAllPendingPodConditionsFulfilled(&job, scaledJob.Spec.ScalingStrategy.PendingPodConditions) {
>           pendingJobs++
>       }
>   } else {
>       if !e.isAnyPodRunningOrCompleted(&job) {
>           pendingJobs++
>       }
>   }
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
