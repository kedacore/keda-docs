+++
title = "Cron"
availability = "v1.5+"
maintainer = "Community"
category = "Scheduling"
description = "Scale applications based on a cron schedule."
go_file = "cron_scaler"
+++

### Trigger Specification

This specification describes the `cron` trigger that scales workloads in/out based on a cron Schedule.

```yaml
triggers:
- type: cron
  metadata:
    # Required
    timezone: Asia/Kolkata  # The acceptable values would be a value from the IANA Time Zone Database.
    start: 0 6 * * *        # At 6:00 AM
    end: 0 20 * * *         # At 8:00 PM
    desiredReplicas: "10"
```

**Parameter list:**

- `timezone` - One of the acceptable values from the IANA Time Zone Database. The list of timezones can be found [here](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).
- `start` - Cron expression indicating the start of the cron schedule.
- `end` - Cron expression indicating the end of the cron schedule.
- `desiredReplicas` - Number of replicas to which the resource has to be scaled **between the start and end** of the cron schedule.

> 💡 **Note:** `start`/`end` support ["Linux format cron"](https://en.wikipedia.org/wiki/Cron) (Minute Hour Dom Month Dow).

> **Notice:**
> **Start and end should not be the same.**
>
> For example, the following schedule is not valid:
> ```yaml
> start: 0 6 * * *        # At 6:00 AM
> end: 0 6 * * *          # also at 6:00 AM
>```

### How does it work?

The CRON scaler allows you to define a time range in which you want to scale your workloads out/in.

When the time window starts, it will scale from the minimum number of replicas to the desired number of replicas based on your configuration.

![](/img/scalers/cron/how-it-works.png)

What the CRON scaler does **not** do, is scale your workloads based on a recurring schedule.

### Scale to 0 during off hours

If you want to scale your deployment to 0 outside office hours / working hours,
you need to set `minReplicaCount: 0` in the ScaledObject, and increase the
replicas during work hours. That way the Deployment will be scaled to 0 outside
that time window. By default the ScaledObject `cooldownPeriod` is 5 minutes, so the actual
scaling down will happen 5 minutes after the cron schedule `end` parameter.

It's almost always an error to try to do it the other way
around, i.e. set `desiredReplicas: 0` in the cron trigger.

> 💡 **NOTE**: When you set `desiredReplicas` in a `cron` trigger, you are defining the **minimum number of replicas** that should run between `start` and `end`. If you also configure other triggers (e.g., `cpu`), the number of replicas during that time can grow from `desiredReplicas` up to `maxReplicaCount` based on those triggers.

#### Example: fixed number of replicas (scale up to 10 replicas from 6AM to 8PM and scale down to 0 replicas otherwise)

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: cron-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: my-deployment
  minReplicaCount: 0
  cooldownPeriod: 300
  triggers:
    - type: cron
      metadata:
        timezone: Asia/Kolkata
        start: 0 6 * * *
        end: 0 20 * * *
        desiredReplicas: "10"
```

#### Example: dynamic number of replicas (0 during night, between 1 and 4 during day)

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: cron-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: my-deployment
  minReplicaCount: 0
  maxReplicaCount: 4
  cooldownPeriod: 300
  triggers:
    - type: cron
      metadata:
        timezone: Asia/Kolkata
        start: 0 6 * * *
        end: 0 20 * * *
        desiredReplicas: "1"
    - type: cpu
      metricType: Utilization
      metadata:
        value: "80"
```
The deployment will scale to 0 between 20:00 and 06:00, and will have between 1 and 4 replicas between 06:00 and 20:00.
