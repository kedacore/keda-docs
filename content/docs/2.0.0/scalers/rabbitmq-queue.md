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
    host: RabbitMqHost
    queueLength: '20' # Optional. Queue length target for HPA. Default: 20 messages
    queueName: testqueue
    includeUnacked: 'true' # Optional, use unacked + ready messages count
    apiHost: RabbitApiHost # Optional HTTP managemet API endpoint
```

The `host` value is the name of the environment variable your deployment uses to get the connection string. This is usually resolved from a `Secret V1` or a `ConfigMap V1` collections. `env` and `envFrom` are both supported.  The resolved host should follow a format like `amqp://guest:password@localhost:5672/vhost`

`apiHost` has the similar format but for HTTP API endpoint, like `https://guest:password@localhost:443/vhostname`. Note it has optional vhost name after the host slash which will be used to scope API request.

By default `includeUnacked` is `false` in this case scaler uses AMQP protocol, requires `host` and only counts messages in the queue and ignores unacked messages.
If `includeUnacked` is `true` then `host` is not required but `apiHost` is required in this case scaler uses HTTP management API and counts messages in the queue + unacked messages count.

### Authentication Parameters

Not supported yet.

### Example

AMQP protocol:

```yaml
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
      # Required
      host: RabbitMqHost # references a value of format amqp://guest:password@localhost:5672/vhost
      queueName: testqueue
      queueLength: "20"
```

HTTP protocol:

```yaml
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
      # Required
      apiHost: RabbitApiHost # references a value of format https://guest:password@localhost:443/vhostname
      queueName: testqueue
      queueLength: "20"
```
