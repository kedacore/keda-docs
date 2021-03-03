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
    protocol: auto # Optional. Specifies protocol to use, either amqp or http, or auto to autodetect based on the `host` value. Default value is auto.
    queueLength: '20' # Optional. Queue length target for HPA. Default: 20 messages if `publishRate` is not specified, or 0 if `publishRate` is specified
    publishRate: '100' # Optional. Publish/sec. target on the queue for HPA. Requires http host/protocol
    queueName: testqueue
    vhostName: / # Optional. If not specified, use the vhost in the `host` connection string.
    # Alternatively, you can use existing environment variables to read configuration from:
    # See details in "Parameter list" section
    hostFromEnv: RABBITMQ_HOST # Optional. You can use this instead of `host` parameter
```

**Parameter list:**

- `host`: Host of RabbitMQ with format `amqp://<host>:<port>/vhost`. The resolved host should follow a format like `amqp://guest:password@localhost:5672/vhost` or
    `http://guest:password@localhost:15672/vhost`. When using a username/password consider using `hostFromEnv` or a TriggerAuthentication.

- `queueName`: Name of the queue to read message from. Required.
- `queueLength`: Target value for queue length passed to the scaler. Example: if one pod can handle 10 messages, set the queue length target to 10. If the actual number of messages in the queue is 30, the scaler scales to 3 pods. Default is 20 unless `publishRate` is specified, in which case `queueLength` is disabled for this trigger. Optional and exclusive with `publishRate`.
- `publishRate`: Target value for queue publish/sec. rate passed to the scaler. Example: if one pod can handle 100 messages/sec., set the publishRate target to 100. If the actual publish/sec. rate on the queue is 500/sec., the scaler scales to 5 pods. `http` protocol is requried to use `publishRate`. Optional and exclusive with `queueLength`
- `protocol`: Protocol to be used for communication. Either `auto`, `http`, or `amqp`. It should correspond with the `host` value. Optional, will autodetect based on the `host` URL if possible.
- `vhostName`: Vhost to use for the connection, overrides any vhost set in the connection string from `host`/`hostFromEnv`.


Some parameters could be provided using environmental variables, instead of setting them directly in metadata. Here is a list of parameters you can use to retrieve values from environment variables:

- `hostFromEnv`: The host and port of the Redis server, similar to `host`, but reads it from an environment variable on the scale target.

> 💡 **Note:** `host`/`hostFromEnv` has an optional vhost name after the host slash which will be used to scope API request.

> ⚠ **Important:** if you have unacknowledged messages and want to have these counted for the scaling to happen, make sure to utilize the `http` REST API interface which allows for these to be counted.

> ⚠ **Important:** a trigger can only have one of `queueLength` or `publishRate` specified (or neither specified which will set `queueLength` to the default value). If scaling against both is desired then the `ScaledObject` should have two triggers, one for `queueLength` and the other for `publishRate`. HPA will scale based on the largest result considering each of the two triggers independently.

### Authentication Parameters

TriggerAuthentication CRD is used to connect and authenticate to RabbitMQ:

- For AMQP, the URI should look similar to `amqp://guest:password@localhost:5672/vhost`
- For HTTP, the URI should look similar to `http://guest:password@localhost:15672/vhost`

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

#### HTTP protocol (`queueLength`):

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

#### HTTP protocol (`publishRate` and `queueLength`):

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
  - type: rabbitmq
    metadata:
      protocol: http
      queueName: testqueue
      publishRate: "100"
    authenticationRef:
      name: keda-trigger-auth-rabbitmq-conn
```
