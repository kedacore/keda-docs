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
    host: RabbitMqHost # Optional. If not specified, it must be done by using TriggerAuthentication.
    queueLength: '20' # Optional. Queue length target for HPA. Default: 20 messages
    queueName: testqueue
    includeUnacked: 'true' # Optional, use unacked + ready messages count
    apiHost: RabbitApiHost # Optional. Represents the HTTP management API endpoint. If not specified, it must be done by using TriggerAuthentication.
  authenticationRef:
    name: keda-trigger-auth-rabbitmq-conn
```

**Parameter list:**

- `host` - Value is the name of the environment variable your deployment uses to get the connection string. This is usually resolved from a `Secret V1` or a `ConfigMap V1` collections. `env` and `envFrom` are both supported.  The resolved host should follow a format like `amqp://guest:password@localhost:5672/vhost`.
- `queueName` - Name of the queue to read message from.
- `queueLength` - Queue length target for HPA. (Default: `20`, Optional)
- `includeUnacked` - By default, `includeUnacked` is `false` in this case scaler uses AMQP protocol, requires `host` and only counts messages in the queue and ignores unacked messages. If `includeUnacked` is `true` then `host` is not required but `apiHost` is required in this case scaler uses HTTP management API and counts messages in the queue + unacked messages count. `host` or `apiHost` value comes from authentication trigger. (Optional)
- `apiHost` - It has similar format as of `host` but for HTTP API endpoint, like https://guest:password@localhost:443/vhostname.

Note `host` and `apiHost` both have an optional vhost name after the host slash which will be used to scope API request.

### Authentication Parameters

TriggerAuthentication CRD is used to connect and authenticate to RabbitMQ:

- `host` - AMQP URI connection string, like `amqp://guest:password@localhost:5672/vhost`.
- `apiHost` - HTTP API endpoint, like `https://guest:password@localhost:443/vhostname`.

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
    deploymentName: rabbitmq-deployment
  triggers:
  - type: rabbitmq
    metadata:
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
  apiHost: <HTTP API endpoint> # base64 encoded value of format https://guest:password@localhost:443/vhostname
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
```
