+++
title = "Redis Lists (supports Redis Cluster)"
layout = "scaler"
availability = "v2.1+"
maintainer = "Community"
description = "Redis Lists scaler with support for Redis Cluster topology"
go_file = "redis_scaler"
+++

### Trigger Specification

This specification describes the `redis-cluster` trigger that scales based on the length of a list in a Redis Cluster.

```yaml
triggers:
- type: redis-cluster
  metadata:
    addresses: localhost:6379 # Comma separated list of the format host:port
    passwordFromEnv: REDIS_PASSWORD
    listName: mylist # Required
    listLength: "5" # Required
    enableTLS: "false" # optional
    # Alternatively, you can use existing environment variables to read configuration from:
    # See details in "Parameter list" section
    addressesFromEnv: REDIS_ADDRESSES # Optional. You can use this instead of `addresses` parameter
```

**Parameter list:**

- `addresses` - Comma separated list of hosts and ports of the Redis Cluster nodes.
- `hosts` - Comma separated list of hosts of the Redis Cluster nodes. Alternative to `addresses` and requires `ports` to be configured as well.
- `ports` - Comma separated list of corresponding ports for the hosts of the Redis Cluster nodes. Alternative to `addresses` and requires `hosts` to be configured as well.
- `passwordFromEnv` - Environment variable to read the authentication password from to authenticate with the Redis server.
  - Both the hostname and password fields need to be set to the names of the environment variables in the target deployment that contain the host name and password respectively.
- `listName` - Name of the Redis List that you want to monitor
- `listLength` - Average target value to trigger scaling actions
- `enableTLS` - If set to `true` allow a connection to a redis queue using tls, the default value for this parameter is false.

Some parameters could be provided using environmental variables, instead of setting them directly in metadata. Here is a list of parameters you can use to retrieve values from environment variables:

- `addressesFromEnv` - The hosts and their respective ports of the Redis Cluster nodes, similar to `addresses`, but reads it from an environment variable on the scale target.
- `hostsFromEnv` - The hosts of the Redis Cluster nodes, similar to `hosts`, but reads it from an environment variable on the scale target.
- `portsFromEnv` - The corresponding ports for the hosts of the Redis Cluster nodes, similar to `ports`, but reads it from an environment variable on the scale target.

### Authentication Parameters

You can authenticate by using a password.

**Connection Authentication:**

- `addresses` - Comma separated list of host:port format.
- `hosts` - Comma separated list of hostname of the Redis Cluster nodes. If specified, the `ports` should also be specified
- `ports` - Comma separated list of ports of the Redis Cluster nodes. If specified, the `hosts` should also be specified

**Password Authentication:**

- `password` - Redis password to authenticate with

### Example

Here is an example of how to deploy a scaled object with the `redis-cluster` scale trigger which uses `TriggerAuthentication`.

You can also provide the `passwordFromEnv` on the `ScaledObject` directly.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: votes-db-secret
  namespace: my-project
type: Opaque
data:
  redis_password: YWRtaW4=
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-redis-secret
  namespace: my-project
spec:
  secretTargetRef:
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
  - type: redis-cluster
    metadata:
      addresses: node1:6379, node2:6379, node3:6379
      listName: mylist
      listLength: "10"
    authenticationRef:
      name: keda-trigger-auth-redis-secret
```
