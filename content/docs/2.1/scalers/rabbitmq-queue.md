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
    host: amqp://localhost:5672/vhost # Optional. If not specified, it must be done by using TriggerAuthentication.
    protocol: auto # Optional. Specifies protocol to use, either amqp or http, or auto to autodetect based on the `host` value. Default value is auto.
    queueLength: '20' # Optional. Queue length target for HPA. Default: 20 messages
    queueName: testqueue
    vhostName: / # Optional. If not specified, use the vhost in the `host` connection string.
    # Alternatively, you can use existing environment variables to read configuration from:
    # See details in "Parameter list" section
    hostFromEnv: RABBITMQ_HOST # Optional. You can use this instead of `host` parameter
```

**Parameter list:**

- `host` - Host of RabbitMQ with format `amqp://<host>:<port>/vhost`. The resolved host should follow a format like `amqp://guest:password@localhost:5672/vhost` or `http://guest:password@localhost:15672/vhost`. When using a username/password consider using `hostFromEnv` or a TriggerAuthentication.
- `queueName` - Name of the queue to read message from.
- `queueLength` - Target value for queue length passed to the scaler. Example: if one pod can handle 10 messages, set the queue length target to 10. If the actual number of messages in the queue is 30, the scaler scales to 3 pods. Default is 20. Optional.
- `protocol` - Protocol to be used for communication. (Values: `auto`, `http`, `amqp`, Default: `auto`, Optional)
- `vhostName` - Vhost to use for the connection, overrides any vhost set in the connection string from `host`/`hostFromEnv`. (Optional)


Some parameters could be provided using environmental variables, instead of setting them directly in metadata. Here is a list of parameters you can use to retrieve values from environment variables:

- `hostFromEnv` - The host and port of the RabbitMQ server, similar to `host`, but reads it from an environment variable on the scale target.

> 💡 **Note:** `host`/`hostFromEnv` has an optional vhost name after the host slash which will be used to scope API request.

> ⚠ **Important:** if you have unacknowledged messages and want to have these counted for the scaling to happen, make sure to utilize the `http` REST API interface which allows for these to be counted.

### Authentication Parameters

TriggerAuthentication CRD is used to connect and authenticate to RabbitMQ:

- For AMQP, the URI should look similar to `amqp://guest:password@localhost:5672/vhost`.
- For HTTP, the URI should look similar to `http://guest:password@localhost:15672/vhost`.

> See the [RabbitMQ Ports](https://www.rabbitmq.com/networking.html#ports) section for more details on how to configure the ports.

### Example

#### AMQP protocol:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-rabbitmq-secret
data:
  host: <AMQP URI connection string> # base64 encoded value of format amqp://guest:password@localhost:5672/vhost
---
apiVersion: keda.sh/v1alpha1
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
apiVersion: keda.sh/v1alpha1
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
      protocol: amqp
      queueName: testqueue
      queueLength: "20"
    authenticationRef:
      name: keda-trigger-auth-rabbitmq-conn
```

#### HTTP protocol:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-rabbitmq-secret
data:
  host: <HTTP API endpoint> # base64 encoded value of format http://guest:password@localhost:15672/vhost
---
apiVersion: keda.sh/v1alpha1
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
apiVersion: keda.sh/v1alpha1
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
