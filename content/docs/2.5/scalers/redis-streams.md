+++
title = "Redis Streams"
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
    address: localhost:6379 # Required if host and port are not provided. Format - host:port
    host: localhost # Required if address is not provided
    port: "6379" # Required if address is not provided and host has been provided.
    usernameFromEnv: REDIS_USERNAME # optional (can also use authenticationRef)
    passwordFromEnv: REDIS_PASSWORD # optional (can also use authenticationRef)
    stream: my-stream # Required - name of the Redis Stream
    consumerGroup: my-consumer-group # Required - name of consumer group associated with Redis Stream
    pendingEntriesCount: "10" # Required - number of entries in the Pending Entries List for the specified consumer group in the Redis Stream
    enableTLS: "false" # optional
    databaseIndex: "0" # optional
    # Alternatively, you can use existing environment variables to read configuration from:
    # See details in "Parameter list" section
    addressFromEnv: REDIS_ADDRESS # Optional. You can use this instead of `address` parameter
    hostFromEnv: REDIS_HOST # Optional. You can use this instead of `host` parameter
    portFromEnv: REDIS_PORT # Optional. You can use this instead of `port` parameter
```

**Parameter list:**

- `address` -  The host and port of the Redis server in the format `host:port`, for example `my-redis:6379`.

> As an alternative to the `address` field, the user can specify `host` and `port` parameters.

- `host` - The host of the Redis server.

> It is not required if `address` has been provided.

- `port` - The port of the Redis server.

> It is only to be used along with the `host`/`hostFromEnv` attribute and not required if `address` has been provided.

- `usernameFromEnv` - Name of the environment variable your deployment uses to get the Redis username. (Optional)
- `passwordFromEnv` - Name of the environment variable your deployment uses to get the Redis password. (Optional)

- `stream` - Name of the Redis Stream.
- `consumerGroup` - Name of the Consumer group associated with Redis Stream.
- `pendingEntriesCount` - Threshold for the number of `Pending Entries List`. This is the average target value to scale the workload. (Default: `5`, Optional)
- `databaseIndex` - The Redis database index. Defaults to `0` if not specified.
- `enableTLS` - Allow a connection to Redis using tls. (Values: `true`, `false`, Default: `false`, Optional)

> ⚠️ **WARNING:** In this version, `enableTLS: true` automatically skips the certificate verification which is insecure. Use v2.9 or above to properly verify the server certificate.

Some parameters could be provided using environmental variables, instead of setting them directly in metadata. Here is a list of parameters you can use to retrieve values from environment variables:

- `addressFromEnv` - The host and port of the Redis server, similar to `address`, but reads it from an environment variable on the scale target. Name of the environment variable your deployment uses to get the Redis server URL. The resolved host should follow a format like `my-redis:6379`.
- `hostFromEnv` - The host of the Redis server, similar to `host`, but reads it from an environment variable on the scale target.
- `portFromEnv` - The port of the Redis server, similar to `port`, but reads it from an environment variable on the scale target.

### Authentication Parameters

The scaler supports two modes of authentication:

#### Using username/password authentication

Use the `username` and `password` field in the `metadata` to specify the name of an environment variable that your deployment uses to get the Redis username/password.

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
        addressFromEnv: REDIS_HOST
        usernameFromEnv: REDIS_USERNAME # name of the environment variable in the Deployment
        passwordFromEnv: REDIS_PASSWORD # name of the environment variable in the Deployment
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
  name: redis-streams-auth
type: Opaque
data:
  redis_username: <encoded redis username>
  redis_password: <encoded redis password>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-redis-stream-triggerauth
spec:
  secretTargetRef:
    - parameter: username
      name: redis-streams-auth # name of the Secret
      key: redis_username # name of the key in the Secret
    - parameter: password
      name: redis-streams-auth # name of the Secret
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
        address: localhost:6379
        stream: my-stream
        consumerGroup: consumer-group-1
        pendingEntriesCount: "10"
      authenticationRef:
        name: keda-redis-stream-triggerauth # name of the TriggerAuthentication resource
```
