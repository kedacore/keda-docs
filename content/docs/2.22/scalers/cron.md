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
- `start` - Cron expression indicating the start of the cron schedule. Supports [`H`](#spreading-schedules-with-h).
- `end` - Cron expression indicating the end of the cron schedule. Supports [`H`](#spreading-schedules-with-h).
- `desiredReplicas` - Number of replicas to which the resource has to be scaled **between the start and end** of the cron schedule.

> 💡 **Note:** `start`/`end` support ["Linux format cron"](https://en.wikipedia.org/wiki/Cron) (Minute Hour Dom Month Dow), plus the Jenkins-style [`H`](#spreading-schedules-with-h) symbol.

> **Notice:**
> **Start and end should not be the same.**
>
> For example, the following schedule is not valid:
> ```yaml
> start: 0 6 * * *        # At 6:00 AM
> end: 0 6 * * *          # also at 6:00 AM
>```
>
> This also applies after `H` is resolved, e.g. `start: H 6 * * *` with `end: H/60 6 * * *`.

### How does it work?

The CRON scaler allows you to define a time range in which you want to scale your workloads out/in.

When the time window starts, it will scale from the minimum number of replicas to the desired number of replicas based on your configuration.

![](/img/scalers/cron/how-it-works.png)

What the CRON scaler does **not** do, is scale your workloads based on a recurring schedule.

> 💡 **NOTE**: The Cron scaler defines an active **time window** (between `start` and `end`) during which target replicas/workloads remain scaled out or in. It is not designed to trigger periodic or recurring execution of tasks (e.g., executing a task every 15 minutes or once a day).
>
> If you need to run scheduled recurring workloads rather than scaling continuous workloads across time intervals, consider using Kubernetes native [CronJobs](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/) or KEDA [`ScaledJobs`](./../concepts/scaling-jobs.md) with an event-based trigger.

### Spreading schedules with `H`

When many ScaledObjects share a schedule, they all scale at the same moment. Use `H` (hash), as in
[Jenkins](https://www.jenkins.io/doc/book/pipeline/syntax/#cron-syntax), in any field of `start` or `end`
to spread them across a range. Times are not unique: some ScaledObjects can land on the same minute.

```yaml
start: H(0-29) 8 * * *   # between 8:00 and 8:29
end: H(0-29) 18 * * *    # between 18:00 and 18:29
```

| ScaledObject     | `start: 0 8 * * *` | `start: H(0-29) 8 * * *` | `end: H(0-29) 18 * * *` |
|------------------|--------------------|--------------------------|-------------------------|
| `default/api`    | 8:00               | 8:27                     | 18:27                   |
| `default/web`    | 8:00               | 8:23                     | 18:23                   |
| `default/worker` | 8:00               | 8:19                     | 18:19                   |

```text
              8:00      8:10      8:20      8:30
              |---------|---------|---------|
without H     ▲                                api, web, worker
with H                           ▲   ▲   ▲     worker 8:19 · web 8:23 · api 8:27
```

| Form       | Meaning                                    | Example (`default/api`)                 |
|------------|--------------------------------------------|-----------------------------------------|
| `H`        | One value in the field's full range        | `H 8 * * *` → `57 8 * * *`              |
| `H(a-b)`   | One value from `a` to `b`                  | `H(0-29) 8 * * *` → `27 8 * * *`        |
| `H/n`      | Every `n`, from an offset below `n`        | `H/15 * * * *` → `12-59/15 * * * *`     |
| `H(a-b)/n` | Every `n` from `a` to `b`, from an offset  | `H(0-29)/10 * * * *` → `7-29/10 * * * *` |

- The value comes from the ScaledObject's namespace, name and trigger index. It stays the same across restarts; renaming the ScaledObject or reordering its triggers can change it.
- `start` and `end` share the hash. The **same `H` token** (same range and step, in the same field) in both keeps the window length, as in the table above. Different tokens can change it, e.g. `H(0-29)` and `H(0-29)/10`.
- Bare `H` in day of month picks 1–28. `H/1` is the same as `H`. The step can't be larger than the range.
- Schedules have minute precision; widen the range to spread more ScaledObjects.

### Scale to 0 during off hours

If you want to scale your deployment to 0 outside office hours / working hours,
you need to set `minReplicaCount: 0` in the ScaledObject, and increase the
replicas during work hours. That way the Deployment will be scaled to 0 outside
that time window. By default the ScaledObject `cooldownPeriod` is 5 minutes, so the actual
scaling down will happen 5 minutes after the cron schedule `end` parameter.

It's almost always an error to try to do it the other way
around, i.e. set `desiredReplicas: 0` in the cron trigger.

> 💡 **NOTE**: As the HPA Controller will evaluate all the metrics at once and will take the one which requires more instances (`max(metrics)`), the value set for `desiredReplicas` technically acts as a "dynamic" minimum replicas. For example, if you have other trigger like CPU, during the time between `start` and `end` you will have AT LEAST `desiredReplicas` because of that `max(metrics)`.


> Once a deployment is scaled down to 0 replicas, the checks relying on pod-related metrics are **ignored**, given that no pods are currently running and these metrics are therefore impossible to retrieve. For this reason, **pod-related metrics are also ignored** for scaling to zero and this process is done only considering external metrics.

#### TL;DR
- Set `minReplicaCount` to 0
- Create your `cron` trigger: define `start`, `end` and `timezone`, and set `desiredReplicas` to the previous value of `minReplicaCount`
- If you also want to use other criteria to scale your deployment, just add other triggers to your `ScaledObject`


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
