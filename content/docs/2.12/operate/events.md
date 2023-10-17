+++
title = "Events"
description = "Kubernetes Events emitted by KEDA"
weight = 100
+++

## Kubernetes Events emitted by KEDA

KEDA emits the following [Kubernetes Events](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.19/#event-v1-core):

| Event                                 | Type      | Description                                                                                                                 |
| ------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------- |
| `ScaledObjectReady`                   | `Normal`  | On the first time a ScaledObject is ready, or if the previous ready condition status of the object was `Unknown` or `False` |
| `ScaledJobReady`                      | `Normal`  | On the first time a ScaledJob is ready, or if the previous ready condition status of the object was `Unknown` or `False`    |
| `ScaledObjectCheckFailed`             | `Warning` | If the check validation for a ScaledObject fails                                                                            |
| `ScaledJobCheckFailed`                | `Warning` | If the check validation for a ScaledJob fails                                                                               |
| `ScaledObjectDeleted`                 | `Normal`  | When a ScaledObject is deleted and removed from KEDA watch                                                                  |
| `ScaledJobDeleted`                    | `Normal`  | When a ScaledJob is deleted and removed from KEDA watch                                                                     |
| `KEDAScalersStarted`                  | `Normal`  | When Scalers watch loop have started for a ScaledObject or ScaledJob                                                        |
| `KEDAScalersStopped`                  | `Normal`  | When Scalers watch loop have stopped for a ScaledObject or a ScaledJob                                                      |
| `KEDAScalerFailed`                    | `Warning` | When a Scaler fails to create or check its event source                                                                     |
| `KEDAScaleTargetActivated`            | `Normal`  | When the scale target (Deployment, StatefulSet, etc) of a ScaledObject is scaled to 1                                       |
| `KEDAScaleTargetDeactivated`          | `Normal`  | When the scale target (Deployment, StatefulSet, etc) of a ScaledObject is scaled to 0                                       |
| `KEDAScaleTargetActivationFailed`     | `Warning` | When KEDA fails to scale the scale target of a ScaledObject to 1                                                            |
| `KEDAScaleTargetDeactivationFailed`   | `Warning` | When KEDA fails to scale the scale target of a ScaledObject to 0                                                            |
| `KEDAJobsCreated`                     | `Normal`  | When KEDA creates jobs for a ScaledJob                                                                                      |
| `TriggerAuthenticationAdded`          | `Normal`  | When a new TriggerAuthentication is added                                                                                   |
| `TriggerAuthenticationDeleted`        | `Normal`  | When a TriggerAuthentication is deleted                                                                                     |
| `ClusterTriggerAuthenticationAdded`   | `Normal`  | When a new ClusterTriggerAuthentication is added                                                                            |
| `ClusterTriggerAuthenticationDeleted` | `Normal`  | When a ClusterTriggerAuthentication is deleted                                                                              |

## CloudEvent Support (Experimental)

### CloudEventSource Resource
`CloudEventSource` resource now can be created in KEDA for emitting events to user's custom CloudEvent sink. Event will be emitted to both Kubernetes Events and CloudEvents Destination if CloudEventSource resource is created. This specification describes the `CloudEventSource` Custom Resource definition:

[`cloudeventsource_types.go`](https://github.com/kedacore/keda/blob/v2.13.0/pkg/apis/keda/v1alpha1/cloudeventsource_types.go)

```yaml
apiVersion: keda.k8s.io/v1alpha1
kind: EventSource
metadata:
  name: {cloud-event-name}
spec:
  clusterName: {cluster-name} #Optional. Will be used in source/subject. And a "default" value will be set if this value is empty 
  destination:
    http:
      uri: http://foo.bar
```

In general, an event emitted by KEDA would fundamentally come down to the following structure:
```json
{
    "specversion" : "1.0",
    "type" : "com.cloudeventsource.keda",
    "source" : "/{cluster-name}/{namespace}/keda",
    "subject" : "/{cluster-name}/{namespace}/workload/{scaledobject-name}",
    "id" : "<guid>",
    "time" : "2018-04-05T17:31:00Z",
    "datacontenttype" : "application/json",
    "data" : {
      "reason":"<event-reason>",
      "message":"<event-message>"
   }
}
```

### Destination
There will be multiple type of destination to emit KEDA events. Nowadays an HTTP CloudEvent destination is supported.
#### CloudEvent HTTP
```yaml
  destination:
    http:
      uri: http://foo.bar  #An http endpoint that can receive cloudevent
```