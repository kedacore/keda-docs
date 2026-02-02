+++
title = "Events reference"
description = "Kubernetes Events emitted by KEDA"
weight = 2500
+++

KEDA emits the following [Kubernetes Events](https://kubernetes.io/docs/reference/kubernetes-api/cluster-resources/event-v1/):

| Event                                 | Type      | Description                                                                                                                 |
|---------------------------------------|-----------|-----------------------------------------------------------------------------------------------------------------------------|
| `ScaledObjectReady`                   | `Normal`  | On the first time a ScaledObject is ready, or if the previous ready condition status of the object was `Unknown` or `False` |
| `ScaledJobReady`                      | `Normal`  | On the first time a ScaledJob is ready, or if the previous ready condition status of the object was `Unknown` or `False`    |
| `ScaledObjectCheckFailed`             | `Warning` | If the check validation for a ScaledObject fails                                                                            |
| `ScaledJobCheckFailed`                | `Warning` | If the check validation for a ScaledJob fails                                                                               |
| `ScaledObjectUpdateFailed`            | `Warning` | When KEDA fails to update status for a ScaledObject                                                                         |
| `ScaledJobUpdateFailed`               | `Warning` | When KEDA fails to update status for a ScaledJob                                                                            |
| `ScaledObjectPaused`                  | `Normal`  | When a ScaledObject is paused                                                                                               |
| `ScaledObjectUnpaused`                | `Normal`  | When a ScaledObject is unpaused                                                                                             |
| `ScaledObjectFallbackActivated`       | `Normal`  | When a ScaledObject fallback becomes active                                                                                 |
| `ScaledObjectFallbackDeactivated`     | `Normal`  | When a ScaledObject fallback becomes inactive                                                                               |
| `ScaledObjectDeleted`                 | `Normal`  | When a ScaledObject is deleted and removed from KEDA watch                                                                  |
| `ScaledJobDeleted`                    | `Normal`  | When a ScaledJob is deleted and removed from KEDA watch                                                                     |
| `ScaledJobPaused`                     | `Normal`  | When a ScaledJob is paused                                                                                                  |
| `ScaledJobUnpaused`                   | `Normal`  | When a ScaledJob is unpaused                                                                                                |
| `ScaledJobPauseFailed`                | `Warning` | When KEDA fails to pause a ScaledJob                                                                                        |
| `ScaledJobRolloutCleanupStarted`      | `Normal`  | When KEDA starts cleaning up Jobs owned by the previous version of a ScaledJob                                              |
| `ScaledJobRolloutCleanupCompleted`    | `Normal`  | When KEDA completes cleanup of Jobs owned by the previous version of a ScaledJob                                            |
| `ScaledJobRolloutCleanupFailed`       | `Warning` | When KEDA fails to delete a Job owned by the previous version of a ScaledJob                                                |
| `ScaledJobActive`                     | `Normal`  | When a ScaledJob becomes active (triggers are active and scaling is performed)                                              |
| `ScaledJobInactive`                   | `Normal`  | When a ScaledJob becomes inactive (triggers are not active and scaling is not performed)                                    |
| `KEDAScalersStarted`                  | `Normal`  | When Scalers watch loop have started for a ScaledObject or ScaledJob                                                        |
| `KEDAScalersStopped`                  | `Normal`  | When Scalers watch loop have stopped for a ScaledObject or a ScaledJob                                                      |
| `KEDAScalerFailed`                    | `Warning` | When a Scaler fails to create or check its event source                                                                     |
| `KEDAMetricSourceFailed`              | `Warning` | When a scaler fails as a metric source for custom formula                                                                   |
| `KEDAScalerInfo`                      | `Normal`  | When a Scaler contains deprecated field                                                                                     |
| `KEDAScalerInfo`                      | `Warning` | When a Scaler contains unexpected parameter (disabled by default, enable with `KEDA_CHECK_UNEXPECTED_SCALERS_PARAMS`)       |
| `KEDAScaleTargetActivated`            | `Normal`  | When the scale target (Deployment, StatefulSet, etc) of a ScaledObject is scaled to 1, triggered by {scalers1;scalers2;...} |
| `KEDAScaleTargetDeactivated`          | `Normal`  | When the scale target (Deployment, StatefulSet, etc) of a ScaledObject is scaled to 0                                       |
| `KEDAScaleTargetActivationFailed`     | `Warning` | When KEDA fails to scale the scale target of a ScaledObject to 1                                                            |
| `KEDAScaleTargetDeactivationFailed`   | `Warning` | When KEDA fails to scale the scale target of a ScaledObject to 0                                                            |
| `KEDAJobsCreated`                     | `Normal`  | When KEDA creates jobs for a ScaledJob                                                                                      |
| `KEDAJobCreateFailed`                 | `Warning` | When KEDA fails to create a Job for a ScaledJob                                                                             |
| `TriggerAuthenticationAdded`          | `Normal`  | When a new TriggerAuthentication is added                                                                                   |
| `TriggerAuthenticationUpdated`        | `Normal`  | When a TriggerAuthentication is updated                                                                                     |
| `TriggerAuthenticationDeleted`        | `Normal`  | When a TriggerAuthentication is deleted                                                                                     |
| `ClusterTriggerAuthenticationAdded`   | `Normal`  | When a new ClusterTriggerAuthentication is added                                                                            |
| `ClusterTriggerAuthenticationUpdated` | `Normal`  | When a ClusterTriggerAuthentication is updated                                                                              |
| `ClusterTriggerAuthenticationDeleted` | `Normal`  | When a ClusterTriggerAuthentication is deleted                                                                              |
