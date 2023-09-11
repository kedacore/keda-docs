+++
title = "Redis Lists (supports Redis Sentinel)"
availability = "v2.5+"
maintainer = "Community"
description = "Redis Lists scaler with support for Redis Sentinel topology"
go_file = "redis_scaler"
+++

### Trigger Specification

This specification describes the `redis-sentinel` trigger that scales based on the length of a list in a Redis Sentinel setup.

```yaml
triggers:
- type: redis-sentinel
  metadata:
    addresses: localhost:26379 # Comma separated list of the format host:port
    usernameFromEnv: REDIS_USERNAME # optional
    passwordFromEnv: REDIS_PASSWORD # optional
    sentinelUsernameFromEnv: REDIS_SENTINEL_USERNAME # optional
    sentinelPasswordFromEnv: REDIS_SENTINEL_PASSWORD # optional
    sentinelMasterFromEnv: REDIS_SENTINEL_MASTER # optional
    listName: mylist # Required
    listLength: "5" # Required
    activationListLength: "5" # optional
    enableTLS: "false" # optional
    unsafeSsl: "false" # optional
    # Alternatively, you can use existing environment variables to read configuration from:
    # See details in "Parameter list" section
    addressesFromEnv: REDIS_ADDRESSES # Optional. You can use this instead of `addresses` parameter
```

**Parameter list:**

- `addresses` - Comma separated list of hosts and ports of the Redis Sentinel nodes.
- `hosts` - Comma separated list of hosts of the Redis Sentinel nodes. Alternative to `addresses` and requires `ports` to be configured as well.
- `ports` - Comma separated list of corresponding ports for the hosts of the Redis Sentinel nodes. Alternative to `addresses` and requires `hosts` to be configured as well.
- `usernameFromEnv` - Environment variable to read the authentication username from to authenticate with the Redis server.
- `passwordFromEnv` - Environment variable to read the authentication password from to authenticate with the Redis server.
  - Both the hostname, username and password fields need to be set to the names of the environment variables in the target deployment that contain the host name, username and password respectively.
- `sentinelUsernameFromEnv` - Environment variable to read the authentication username from to authenticate with the Redis Sentinel server.
- `sentinelPasswordFromEnv` - Environment variable to read the authentication password from to authenticate with the Redis Sentinel server.
- `sentinelMaster` - The name of the master in Sentinel to get the Redis server address for.
- `listName` - Name of the Redis List that you want to monitor.
- `listLength` - Average target value to trigger scaling actions.
- `activationListLength` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional)
- `enableTLS` - Allow a connection to a redis queue using tls. (Values: `true`, `false`, Default: `false`, Optional)
- `unsafeSsl` - Used for skipping certificate check e.g: using self-signed certs. (Values: `true`,`false`, Default: `false`, Optional, This requires `enableTLS: true`)

Some parameters could be provided using environmental variables, instead of setting them directly in metadata. Here is a list of parameters you can use to retrieve values from environment variables:

- `addressesFromEnv` - The hosts and their respective ports of the Redis Sentinel nodes, similar to `addresses`, but reads it from an environment variable on the scale target.
- `hostsFromEnv` - The hosts of the Redis Sentinel nodes, similar to `hosts`, but reads it from an environment variable on the scale target.
- `portsFromEnv` - The corresponding ports for the hosts of the Redis Sentinel nodes, similar to `ports`, but reads it from an environment variable on the scale target.
- `sentinelMasterFromEnv` - The name of the master in Sentinel to get the Redis server address for, similar to `sentinelMaster`, but reads it from an environment variable on the scale target.

### Authentication Parameters

You can authenticate by using a password.

**Connection Authentication:**

- `addresses` - Comma separated list of host:port format.
- `hosts` - Comma separated list of hostname of the Redis Sentinel nodes. If specified, the `ports` should also be specified.
- `ports` - Comma separated list of ports of the Redis Sentinel nodes. If specified, the `hosts` should also be specified.
- `sentinelMaster` - The name of the master in Sentinel to get the Redis server address for.

**Authentication:**

- `username` - Redis username to authenticate with.
- `password` - Redis password to authenticate with.

**Sentinel Authentication:**

- `sentinelUsername` - Redis Sentinel username to authenticate with.
- `sentinelPassword` - Redis Sentinel password to authenticate with.


### Example

Here is an example of how to deploy a scaled object with the `redis-sentinel` scale trigger which uses `TriggerAuthentication`.

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
  - type: redis-sentinel
    metadata:
      addresses: node1:26379, node2:26379, node3:26379
      listName: mylist
      listLength: "10"
      sentinelMaster: "mymaster"
    authenticationRef:
      name: keda-trigger-auth-redis-secret
```
