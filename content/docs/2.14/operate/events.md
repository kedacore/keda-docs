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
| `ScaledObjectCheckFailed`             | `Warning` | If the check validation for a ScaledObject fails |                                                                           |
| `ScaledJobCheckFailed`                | `Warning` | If the check validation for a ScaledJob fails            |                                                                     |
| `ScaledObjectDeleted`                 | `Normal`  | When a ScaledObject is deleted and removed from KEDA watch |                                                                    |
| `ScaledJobDeleted`                    | `Normal`  | When a ScaledJob is deleted and removed from KEDA watch |                                                                       |
| `KEDAScalersStarted`                  | `Normal`  | When Scalers watch loop have started for a ScaledObject or ScaledJob |                                                           |
| `KEDAScalersStopped`                  | `Normal`  | When Scalers watch loop have stopped for a ScaledObject or a ScaledJob |                                                         |
| `KEDAScalerFailed`                    | `Warning` | When a Scaler fails to create or check its event source|                                                                       |
| `KEDAScaleTargetActivated`            | `Normal`  | When the scale target (Deployment, StatefulSet, etc) of a ScaledObject is scaled to 1|                                         |
| `KEDAScaleTargetDeactivated`          | `Normal`  | When the scale target (Deployment, StatefulSet, etc) of a ScaledObject is scaled to 0 |                                        |
| `KEDAScaleTargetActivationFailed`     | `Warning` | When KEDA fails to scale the scale target of a ScaledObject to 1|                                                              |
| `KEDAScaleTargetDeactivationFailed`   | `Warning` | When KEDA fails to scale the scale target of a ScaledObject to 0|                                                              |
| `KEDAJobsCreated`                     | `Normal`  | When KEDA creates jobs for a ScaledJob |                                                                                       |
| `TriggerAuthenticationAdded`          | `Normal`  | When a new TriggerAuthentication is added|                                                                                     |
| `TriggerAuthenticationDeleted`        | `Normal`  | When a TriggerAuthentication is deleted|                                                                                       |
| `ClusterTriggerAuthenticationAdded`   | `Normal`  | When a new ClusterTriggerAuthentication is added|                                                                              |
| `ClusterTriggerAuthenticationDeleted` | `Normal`  | When a ClusterTriggerAuthentication is deleted|                                                                                |


## CloudEvent Support (Experimental)

### Subscribing to events with `CloudEventSource`
`CloudEventSource` resource can be used in KEDA for subscribing to events that are emitted to the user's defined CloudEvent sink.

> 📝 Event will be emitted to both Kubernetes Events and CloudEvents Destination if CloudEventSource resource is created.

Here is a the schema of the `CloudEventSource` CRD:

```yaml
apiVersion: eventing.keda.sh/v1alpha1
kind: CloudEventSource
metadata:
  name: {cloud-event-name}
spec:
  clusterName: {cluster-name} #Optional. Will be used in the source/subject to specify where the event comes from. The default value is 'kubernetes-default' and it can also be set during the installation of KEDA with --k8sClusterName. This one will overwrite others if set.
  destination:
    http:
      uri: http://foo.bar
  eventSubscription: #Optional. Submit included/excluded event types will filter events when emitting events. 
        includedEventTypes: #Optional. Only events in this section will be emitted.
        - keda.scaledobject.failed.v1
        excludedEventTypes: #Optional. Events in this section will not be emitted.       
        - keda.scaledobject.ready.v1
```

In general, an event emitted by KEDA would fundamentally come down to the following structure:
```json
{
    "specversion" : "1.0",
    "type" : "com.cloudeventsource.keda",
    "source" : "/{cluster-name}/{keda-namespace}/keda",
    "subject" : "/{cluster-name}/{namespace}/{object-type}/{object-name}",
    "id" : "<guid>",
    "time" : "2018-04-05T17:31:00Z",
    "datacontenttype" : "application/json",
    "data" : {
      "reason":"<event-reason>",
      "message":"<event-message>"
   }
}
```

### Event Sinks

There will be multiple types of destination to emit KEDA events to.

Here is an overview of the supported destinations:

- [HTTP endpoint](#http-endpoint).

#### HTTP endpoint
```yaml
  destination:
    http:
      uri: http://foo.bar  #An http endpoint that can receive cloudevent
```

### Event Filter
KEDA also has the capability to filter CloudEvents by user. CloudEvents that are configured by type in ```includedEventTypes/excludedEventTypes``` will be included/excluded during emitting events to the sink.
```yaml
eventSubscription: #Optional. Submit included/excluded event types will filter events when emitting events. 
  includedEventTypes: #Optional. Only events in this section will be emitted.
  - keda.scaledobject.failed.v1
  excludedEventTypes: #Optional. Events in this section will not be emitted.       
  - keda.scaledobject.ready.v1
```

### Supported Event List
| Event Type                                | Scenario Description                                                                                                                 | 
| ------------------------------------- |  --------------------------------------------------------------------------------------------------------------------------- | 
| `keda.scaledobject.ready.v1`                   | On the first time a ScaledObject is ready, or if the previous ready condition status of the object was `Unknown` or `False` |  
| `keda.scaledobject.failed.v1`             | If the check validation for a ScaledObject fails |      