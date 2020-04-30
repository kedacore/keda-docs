+++
title = "Azure Service Bus"
layout = "scaler"
maintainer = "Microsoft"
description = "Scale applications based on Azure Service Bus Queues or Topics."
availability = "v1.0+"
go_file = "azure_servicebus_scaler"
+++

### Trigger Specification

This specification describes the `azure-servicebus` trigger for Azure Service Bus Queue or Topic.

```yaml
triggers:
- type: azure-servicebus
  metadata:
    # Required: queueName OR topicName and subscriptionName
    queueName: functions-sbqueue
    # or
    topicName: functions-sbtopic
    subscriptionName: sbtopic-sub1
    # Optional, can use TriggerAuthentication as well
    connection: SERVICEBUS_CONNECTIONSTRING_ENV_NAME # This must be a connection string for a queue itself, and not a namespace level (e.g. RootAccessPolicy) connection string [#215](https://github.com/kedacore/keda/issues/215)
    # Optional
    queueLength: "5" # Optional. Subscription length target for HPA. Default: 5 messages
```

The `connection` value is the name of the environment variable your deployment uses to get the connection string. This is usually resolved from a `Secret V1` or a `ConfigMap V1` collections. `env` and `envFrom` are both supported.

### Authentication Parameters

You can authenticate by using pod identity or connection string authentication.

**Connection String Authentication:**

- `connection` - Connection string for Azure Service Bus Namespace

### Example

Here is an example of how to use managed identity:

```yaml
apiVersion: keda.k8s.io/v1alpha1
kind: TriggerAuthentication
metadata:
  name: azure-servicebus-auth
spec:
  podIdentity:
    provider: azure
---
apiVersion: keda.k8s.io/v1alpha1
kind: ScaledObject
metadata:
  name: azure-servicebus-queue-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    deploymentName: azure-servicebus-queue-function
  triggers:
  - type: azure-servicebus
    metadata:
      # Required: queueName OR topicName and subscriptionName
      queueName: functions-sbqueue
      # or
      topicName: functions-sbtopic
      subscriptionName: sbtopic-sub1
      # Required: connection OR authenticationRef that defines connection
      connection: SERVICEBUS_CONNECTIONSTRING_ENV_NAME # reference to a connection string in deployment
      # or authenticationRef as defined below
      #
      # Optional
      queueLength: "5" # default 5
    authenticationRef:
        name: azure-servicebus-auth # authenticationRef would need either podIdentity or define a connection parameter
```
