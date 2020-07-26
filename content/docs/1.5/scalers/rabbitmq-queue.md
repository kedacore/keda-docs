+++
title = "RabbitMQ Queue"
layout = "scaler"
availability = "v1.0+"
maintainer = "Microsoft"
description = "Scale applications based on RabbitMQ Queue."
go_file = "rabbitmq_scaler"
+++

### Trigger Specification

This specification describes the `rabbitmq` trigger for RabbitMQ Queue.

```yaml
triggers:
- type: rabbitmq
  metadata:
    queueLength: '20'
    queueName: testqueue
    includeUnacked: 'true' # Optional, use unacked + ready messages count
  authenticationRef:
    name: keda-trigger-auth-rabbitmq-conn
```

**Parameter list:**

- `queueLength`: Queue length target for HPA. Default is 20. Optional.
- `includeUnacked`: By default `includeUnacked` is `false` in this case scaler uses AMQP protocol, requires `host` and only counts messages in the queue and ignores unacked messages. If `includeUnacked` is `true` then `host` is not required but `apiHost` is required in this case scaler uses HTTP management API and counts messages in the queue + unacked messages count. Optional. `host` or `apiHost` value comes from authencation trigger.
- `queueName`: Name of the queue to read message from. Required.

### Authentication Parameters

TriggerAuthentication CRD is used to connect and authenticate to RabbitMQ by providing host or apiHost.

- `host`: AMQP URI connection string, like `amqp://guest:password@localhost:5672/vhost`.  Note it has optional vhost name after the host slash which will be used to scope API request.
- `apiHost`: HTTP API endpoint, like `https://guest:password@localhost:443/vhostname`. 

### Example

AMQP protocol:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-rabbitmq-secret
data:
  host: <AMQP URI connection string> # base64 encoded value of format amqp://guest:password@localhost:5672/vhost
---
apiVersion: keda.k8s.io/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    deploymentName: rabbitmq-deployment
  triggers:
  - type: rabbitmq
    metadata:
      queueName: testqueue
      queueLength: "20"
    authenticationRef:
      name: keda-trigger-auth-rabbitmq-conn
---
apiVersion: keda.k8s.io/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-rabbitmq-conn
  namespace: default
spec:
  secretTargetRef:
    - parameter: host
      name: keda-rabbitmq-secret
      key: host
```

HTTP protocol:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-rabbitmq-secret
data:
  apiHost: <HTTP API endpoint> # base64 encoded value of format https://guest:password@localhost:443/vhostname
---
apiVersion: keda.k8s.io/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    deploymentName: rabbitmq-deployment
  triggers:
  - type: rabbitmq
    metadata:
      includeUnacked: "true"
      queueName: testqueue
      queueLength: "20"
    authenticationRef:
      name: rabbitmq-consumer-trigger
---
apiVersion: keda.k8s.io/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-rabbitmq-conn
  namespace: default
spec:
  secretTargetRef:
    - parameter: apiHost
      name: keda-rabbitmq-secret
      key: apiHost
```
