+++
title = "Admission Webhooks"
description = "Automatically validate resource changes to prevent misconfiguration and enforce best practices"
weight = 600
+++

There are some several misconfiguration scenarios that can produce scaling problems in productive workloads, for example: in Kubernetes a single workload should never be scaled by 2 or more HPA because that will produce conflicts and unintended behaviors.

Some errors with data format can be detected during the model validation, but these misconfigurations can't be detected in that step because the model is correct indeed. For trying to avoid those misconfigurations at data plane detecting them early, admission webhooks validate all the incoming (KEDA) resources (new or updated) and reject any resource that doesn't match the rules below.

### Prevention Rules

KEDA will block all incoming changes to `ScaledObject` that don't match these rules:

- The scaled workload (`scaledobject.spec.scaleTargetRef`) is already autoscaled by another other sources (other ScaledObject or HPA).
- CPU and/or Memory trigger are used and the scaled workload doesn't have the requests defined. **This rule doesn't apply to all the workload types, only to `Deployment` and `StatefulSet`.**
- CPU and/or Memory trigger are **the only used triggers** and the ScaledObject defines `minReplicaCount:0`. **This rule doesn't apply to all the workload types, only to `Deployment` and `StatefulSet`.**
- In the case of multiple triggers where a `name` is **specified**, the name must be **unique** (it is not allowed to have multiple triggers with the same name)
- The fallback feature is configured with a metrics type other than AverageValue. Fallback feature only supports AverageValue metrics type and doesn't support CPU and Memory metrics.
- The `ScaledObject` name exceeds 63 characters, or the generated HPA name would exceed 63 characters. KEDA uses the `ScaledObject` name as a label value (`scaledobject.keda.sh/name=<scaledobject-name>`) on the `ScaledObject` and its HPA, and Kubernetes requires label values to be no more than 63 characters. When no custom HPA name is set via `spec.advanced.horizontalPodAutoscalerConfig.name`, KEDA generates an HPA named `keda-hpa-<scaledobject-name>`, which must also be a valid DNS-1123 label (maximum 63 characters). This means the `ScaledObject` name is limited to 63 characters when a custom HPA name is set, and to 54 characters otherwise (to leave room for the `keda-hpa-` prefix). This rule is enforced on both create and update.

KEDA will block all incoming changes to `TriggerAuthentication`/`ClusterTriggerAuthentication` that don't match these rules:

- The specified identity ID for Azure AD Workload Identity and/or Pod Identity is empty. (Default/unset identity ID will be passed through.)
	> NOTE: This only applies if the `TriggerAuthentication/ClusterTriggerAuthentication` is overriding the default identityId provided to KEDA during the installation
