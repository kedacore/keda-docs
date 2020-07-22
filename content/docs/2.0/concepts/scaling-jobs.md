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
  cooldownPeriod:  300 # Optional. Default: 300 seconds
  minReplicaCount: 0   # Optional. Default: 0
  maxReplicaCount: 100 # Optional. Default: 100
  triggers:
  # {list of triggers to create jobs}
```

You can find all supported triggers [here](../scalers).
