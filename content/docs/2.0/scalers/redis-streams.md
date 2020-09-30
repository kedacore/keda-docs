+++
title = "Redis Streams"
layout = "scaler"
availability = "v1.5+"
maintainer = "Community"
description = "Scale applications based on Redis Streams."
go_file = "redis_streams_scaler"
+++

### Trigger Specification

Redis 5.0 introduced [Redis Streams](https://redis.io/topics/streams-intro) which is an append-only log data structure.

One of its features includes [`Consumer Groups`](https://redis.io/topics/streams-intro#consumer-groups), that allows a group of clients to co-operate consuming a different portion of the same stream of messages.

This specification describes the `redis-streams` trigger that scales based on the *Pending Entries List* (see [`XPENDING`](https://redis.io/commands/xpending)) for a specific Consumer Group of a Redis Stream.


```yaml
triggers:
- type: redis-streams
  metadata:
    address: REDIS_SERVER # Required if host and port are not provided. Format - host:port
    host: REDIS_HOST # Required if address is not provided
    port: REDIS_PORT # Required if address is not provided and host has been provided
    password: REDIS_PASSWORD # optional (can also use authenticationRef)
    stream: my-stream # Required - name of the Redis Stream
    consumerGroup: my-consumer-group # Required - name of consumer group associated with Redis Stream
    pendingEntriesCount: "10" # Required - number of entries in the Pending Entries List for the specified consumer group in the Redis Stream
    enableTLS: "false" # optional
    databaseIndex: "0" # optional
```

**Parameter list:**

- `address`: Name of the environment variable your deployment uses to get the Redis server URL. The resolved host should follow a format like `my-redis:6379`.
   - This is usually resolved from a `Secret V1` or a `ConfigMap V1` collections. `env` and `envFrom` are both supported.

> As an alternative to the `address` field, the user can specify `host` and `port` parameters. 

- `host`: Name of the environment variable your deployment uses to get the Redis server host. 
    - This is usually resolved from a `Secret V1` or a `ConfigMap V1` collections. `env` and `envFrom` are both supported.

> It is not required if `address` has been provided

- `port`: Name of the environment variable your deployment uses to get the Redis server port. 
   - This is usually resolved from a `Secret V1` or a `ConfigMap V1` collections. `env` and `envFrom` are both supported.

> It is only to be used along with the `host` attribute and not required if `address` has been provided

- `password` (optional): Name of the environment variable your deployment uses to get the Redis password.
   - This is usually resolved from a `Secret V1` or a `ConfigMap V1` collections. `env` and `envFrom` are both supported.

- `stream`: Name of the Redis Stream

- `consumerGroup`: Name of the Consumer group associated with Redis Stream

- `pendingEntriesCount`: Threshold for the number of `Pending Entries List`. This is the average target value to scale the workload. Defaults to `5` 

- `databaseIndex`: The Redis database index. Defaults to `0` if not specified

- `enableTLS`: Set this to `true` if TLS connection to Redis is required. Defaults to `false`

### Authentication Parameters

The scaler supports two modes of authentication:

#### Using password authentication

Use the `password` field in the `metadata` to specify the name of an environment variable that your deployment uses to get the Redis password.

This is usually resolved from a `Secret V1` or a `ConfigMap V1` collections. `env` and `envFrom` are both supported.

Here is an example:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: redis-streams-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: redis-streams-consumer
  pollingInterval: 15
  cooldownPeriod: 200
  maxReplicaCount: 25
  minReplicaCount: 1
  triggers:
    - type: redis-streams
      metadata:
        address: REDIS_HOST
        password: REDIS_PASSWORD # name of the environment variable in the Deployment
        stream: my-stream
        consumerGroup: consumer-group-1
        pendingEntriesCount: "10"
```

#### Using `TriggerAuthentication`

You can use `TriggerAuthentication` CRD to configure the authentication. For example:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: redis-streams-password
type: Opaque
data:
  redis_password: YWRtaW4=
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-redis-stream-triggerauth
spec:
  secretTargetRef:
    - parameter: password
      name: redis-streams-password # name of the Secret
      key: redis_password # name of the key in the Secret
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: redis-streams-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: redis-streams-consumer
  pollingInterval: 15
  cooldownPeriod: 200
  maxReplicaCount: 25
  minReplicaCount: 1
  triggers:
    - type: redis-streams
      metadata:
        address: REDIS_HOST
        stream: my-stream
        consumerGroup: consumer-group-1
        pendingEntriesCount: "10"
      authenticationRef:
        name: keda-redis-stream-triggerauth # name of the TriggerAuthentication resource
```
