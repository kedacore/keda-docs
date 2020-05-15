+++
title = "Cron"
layout = "scaler"
availability = "v1.0+"
maintainer = "Community"
description = "Scale applications based on Cron Schedules."
go_file = "cron_scaler"
+++

### Trigger Specification

This specification describes the `cron` trigger that scales based on a Cron Schedule.

```yaml
triggers:
- type: cron
  metadata:
    # Required
    timezone: <time zone the cron should be run>
    start: <start of cron>
    end: <end of cron>
    metricName: replicacount
    desiredReplicas: "10"
```

The `start` indicates the start of the Cron schedule and end indicates the end of the Cron schedule.

### Authentication Parameters

Not supported.

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
      metricName: replicacount
      desiredReplicas: "10"
```
