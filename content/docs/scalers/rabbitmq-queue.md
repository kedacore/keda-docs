+++
title = "RabbitMQ Queue"
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
```

The `host` value is the name of the environment variable your deployment uses to get the connection string. This is usually resolved from a `Secret V1` or a `ConfigMap V1` collections. `env` and `envFrom` are both supported.  The resolved host should follow a format like `amqp://guest:password@localhost:5672/vhost`

### Authentication Parameters

Not supported yet.

### Example

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
