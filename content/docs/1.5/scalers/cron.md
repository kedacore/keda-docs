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
    start: 0 0/30 * * *
    end: 0 15/30 * * *
    desiredReplicas: "10"
```

**Parameter list:**

- `timezone` is one of the acceptable values from the IANA Time Zone Database. Required.
- `start` is the cron expression indicating the start of the cron schedule. Required.
- `end` is the cron expression indicating the end of the cron schedule. Required.
- `desiredReplicas` is the number of replicas to which the resource has to be scaled between the start and end of the cron schedule. Required.

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
      start: 0 0/30 * * *
      end: 0 15/30 * * *
      desiredReplicas: "10"
```
