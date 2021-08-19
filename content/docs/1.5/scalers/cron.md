+++
title = "Cron"
layout = "scaler"
availability = "v1.5+"
maintainer = "Community"
description = "Scale applications based on a cron schedule."
go_file = "cron_scaler"
+++

### Trigger Specification

This specification describes the `cron` trigger that scales based on a Cron Schedule.

```yaml
triggers:
- type: cron
  metadata:
    # Required
    timezone: Asia/Kolkata  # The acceptable values would be a value from the IANA Time Zone Database.
    start: 30 * * * *       # Every hour on the 30th minute
    end: 45 * * * *         # Every hour on the 45th minute
    desiredReplicas: "10"
```

**Parameter list:**

- `timezone` is one of the acceptable values from the IANA Time Zone Database. The list of timezones can be found in: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones. Required.
- `start` is the cron expression indicating the start of the cron schedule. Required.
- `end` is the cron expression indicating the end of the cron schedule. Required.
- `desiredReplicas` is the number of replicas to which the resource has to be scaled between the start and end of the cron schedule. Required.

> **Notice:**
> **Start and end should not be same.**
>
> For example, the following schedule is not valid:
> ```yaml
> start: 30 * * * *
> end: 30 * * * *
>```

### Example

```yaml
apiVersion: keda.k8s.io/v1alpha1
kind: ScaledObject
metadata:
  name: cron-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    deploymentName: my-deployment
  triggers:
  - type: cron
    metadata:
      timezone: Asia/Kolkata
      start: 30 * * * *
      end: 45 * * * *
      desiredReplicas: "10"
```
