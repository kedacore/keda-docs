+++
title = "Admission Webhooks"
description = "Automatically validate resource changes to prevent misconfiguration and enforce best practices"
weight = 600
+++

> 💡 The Admission Webhooks are an opt-in feature and will become an opt-out feature as of KEDA v2.12.

### Prevention Rules

KEDA will block all incoming changes to `ScaledObject` that don't match these rules:

- The scaled workload (`scaledobject.spec.scaleTargetRef`) is already autoscaled by another other sources (other ScaledObject or HPA).
- CPU and/or Memory trigger are used and the scaled workload doesn't have the requests defined. **This rule doesn't apply to all the workload types, only to `Deployment` and `StatefulSet`.**
