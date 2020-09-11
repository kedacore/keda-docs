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
    host: amqp://localhost:5672/vhost # Optional. If not specified, it must be done by using TriggerAuthentication.
    hostFromEnv: RABBITMQ_HOST # Optional. If not specified, it must be done by using TriggerAuthentication.
    protocol: amqp # Specifies protocol to use, either amqp or http. Default value is amqp.
    queueLength: '20' # Optional. Queue length target for HPA. Default: 20 messages
    queueName: testqueue
  authenticationRef:
    name: keda-trigger-auth-rabbitmq-conn
```

**Parameter list:**

- `host`: rabbitmq host in this format `amqp://<host>:<port>/vhost`. If using a username/password consider using `hostFromEnv` or a TriggerAuthentication. 
- `hostFromEnv`: Value is the name of the environment variable your deployment uses to get the connection string. 
    This is usually resolved from a `Secret V1` or a `ConfigMap V1` collections. `env` and `envFrom` are both supported.  
    The resolved host should follow a format like `amqp://guest:password@localhost:5672/vhost` or 
    `https://guest:password@localhost:443/vhostname`
- `queueName`: Name of the queue to read message from. Required.
- `queueLength`: Queue length target for HPA. Default is 20. Optional.
- `protocol`: Protocol to be used for communication. Either `http` or `amqp`. It should correspond with the `host` value. 

Note `host`/`hostFromEnv` has an optional vhost name after the host slash which will be used to scope API request.

### Authentication Parameters

TriggerAuthentication CRD is used to connect and authenticate to RabbitMQ:

- For AMQP, the URI should look similar to `amqp://guest:password@localhost:5672/vhost`
- For HTTP, the URI should look similar to `https://guest:password@localhost:443/vhostname`

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
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-rabbitmq-conn
  namespace: default
spec:
  secretTargetRef:
    - parameter: host
      name: keda-rabbitmq-secret
      key: host
---
apiVersion: keda.k8s.io/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: rabbitmq-deployment
  triggers:
  - type: rabbitmq
    metadata:
      protocol: aqmp
      queueName: testqueue
      queueLength: "20"
    authenticationRef:
      name: keda-trigger-auth-rabbitmq-conn
```

HTTP protocol:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-rabbitmq-secret
data:
  host: <HTTP API endpoint> # base64 encoded value of format https://guest:password@localhost:443/vhostname
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
---
apiVersion: keda.k8s.io/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: rabbitmq-deployment
  triggers:
  - type: rabbitmq
    metadata:
      protocol: http
      queueName: testqueue
      queueLength: "20"
    authenticationRef:
      name: keda-trigger-auth-rabbitmq-conn
```
