+++
title = "CloudEvent Support"
description = "Experimental support for cloud events"
weight = 100
+++

## Subscribing to events with `CloudEventSource`
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
  authenticationRef: 
    name: {trigger-authentication-name} #Optional. Used to reference a `TriggerAuthentication` for authentication. 
    kind: TriggerAuthentication # Optional. Used to choose the authentication scopes. https://keda.sh/docs/latest/concepts/authentication/#authentication-scopes-namespace-vs-cluster
  destination:
    http:
      uri: http://foo.bar
    azureEventGridTopic:
      endpoint: https://my-topic.eastus-1.eventgrid.azure.net/api/events

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

## Event Sinks

There will be multiple types of destination to emit KEDA events to.

Here is an overview of the supported destinations:

- [HTTP endpoint](#http-endpoint).
- [Azure Event Grid endpoint](#azure-event-grid).

### HTTP endpoint
```yaml
  destination:
    http:
      uri: http://foo.bar  #An http endpoint that can receive cloudevent
```

### Azure Event Grid

```yaml
  destination:
    azureEventGrid:
      endpoint: foo.bar #endpoint from AzureEventGrid Topic
```

Authentication information must be provided by using `authenticationRef` which allows you to provide the access key or managed identity for Azure Event Grid authentication by providing a `TriggerAuthentication`.

Here is an overview of the supported authentication types:

#### Connection String Authentication

- `accessKey` - Access key string for the Azure Event Grid connection auth.

#### Pod identity based authentication
[Azure AD Workload Identity](https://azure.github.io/azure-workload-identity/docs/) providers can be used.

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: nameOfTriggerAuth
  namespace: default
spec:
  podIdentity:
    provider: azure-workload
```

## Event Filter

You can include filter(s) to define what event types you are interested in, or want to ignore. This is done by using `includedEventTypes` or `excludedEventTypes` respectively for a given sink.

```yaml
eventSubscription: #Optional. Submit included/excluded event types will filter events when emitting events. 
  includedEventTypes: #Optional. Only events in this section will be emitted.
  - keda.scaledobject.failed.v1
  excludedEventTypes: #Optional. Events in this section will not be emitted.       
  - keda.scaledobject.ready.v1
```

## Supported Event List
| Event Type                    | Scenario Description                                                                                                        | 
|-------------------------------|-----------------------------------------------------------------------------------------------------------------------------| 
| `keda.scaledobject.ready.v1`  | On the first time a ScaledObject is ready, or if the previous ready condition status of the object was `Unknown` or `False` |  
| `keda.scaledobject.failed.v1` | If the check validation for a ScaledObject fails                                                                            |      
