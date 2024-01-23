+++
title = "Redis Lists"
availability = "v1.0+"
maintainer = "Community"
description = "Scale applications based on Redis Lists."
go_file = "redis_scaler"
+++

### Trigger Specification

This specification describes the `redis` trigger that scales based on the length of a list in Redis.

```yaml
triggers:
- type: redis
  metadata:
    address: localhost:6379 # Format must be host:port
    usernameFromEnv: REDIS_USERNAME # optional
    passwordFromEnv: REDIS_PASSWORD
    listName: mylist # Required
    listLength: "5" # Required
    activationListLength: "5" # optional
    enableTLS: "false" # optional
    databaseIndex: "0" # optional
    # Alternatively, you can use existing environment variables to read configuration from:
    # See details in "Parameter list" section
    addressFromEnv: REDIS_HOST # Optional. You can use this instead of `address` parameter
```

**Parameter list:**

- `address` - The host and port of the Redis server.
- `host` - The host of the Redis server. Alternative to `address` and requires `port` to be configured as well.
- `port` - The port of the Redis server. Alternative to `address` and requires `host` to be configured as well.
- `usernameFromEnv` - Environment variable to read the authentication username from to authenticate with the Redis server.
- `passwordFromEnv` - Environment variable to read the authentication password from to authenticate with the Redis server.
  - Both the hostname, username and password fields need to be set to the names of the environment variables in the target deployment that contain the host name, username and password respectively.
- `listName` - Name of the Redis List that you want to monitor.
- `listLength` - Average target value to trigger scaling actions.
- `activationListLength` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)
- `enableTLS` - Allow a connection to a redis queue using tls. (Values: `true`, `false`, Default: `false`, Optional)
- `databaseIndex` - Index of Redis database to use. If not specified, the default value is 0.

Some parameters could be provided using environmental variables, instead of setting them directly in metadata. Here is a list of parameters you can use to retrieve values from environment variables:

- `addressFromEnv` - The host and port of the Redis server, similar to `address`, but reads it from an environment variable on the scale target.
- `hostFromEnv` - The host of the Redis server, similar to `host`, but reads it from an environment variable on the scale target.
- `portFromEnv` - The port of the Redis server, similar to `port`, but reads it from an environment variable on the scale target.

### Authentication Parameters

You can authenticate by using a username (optional) and password.

**Connection Authentication:**

- `address` - The hostname and port for the Redis server (host:port format).
- `host` - The hostname of the Redis server. If specified, the `port` should also be specified.
- `port` - The port of the Redis server. If specified, the `host` should also be specified.

**Authentication:**

- `username` - Redis username to authenticate with.
- `password` - Redis password to authenticate with.

### Example

Here is an example of how to deploy a scaled object with the `redis` scale trigger which uses `TriggerAuthentication`.

You can also provide the `usernameFromEnv` and `passwordFromEnv` on the `ScaledObject` directly.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: votes-db-secret
  namespace: my-project
type: Opaque
data:
  redis_username: YWRtaW4=
  redis_password: YWRtaW4=
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-redis-secret
  namespace: my-project
spec:
  secretTargetRef:
  - parameter: username
    name: votes-db-secret
    key: redis_username
  - parameter: password
    name: votes-db-secret
    key: redis_password
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: redis-scaledobject
  namespace: my-project
spec:
  scaleTargetRef:
    name: votes
  triggers:
  - type: redis
    metadata:
      address: localhost:6379
      listName: mylist
      listLength: "10"
    authenticationRef:
      name: keda-trigger-auth-redis-secret
```
