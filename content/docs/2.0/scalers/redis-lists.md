+++
title = "Redis Lists"
layout = "scaler"
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
    address: REDIS_HOST # Required host:port format
    password: REDIS_PASSWORD
    listName: mylist # Required
    listLength: "5" # Required
    enableTLS: "false" # optional
    databaseIndex: "0" # optional
```

The `address` field in the spec holds the host and port of the Redis server. The value should be the name of the environment variable in the deployment/job that contains the actual value for the Redis server address.

As an alternative to the `address` field the user can specify `host` and `port` parameters. If you would prefer to specify on actual value for the `address`, then the TriggerAuthentication object could used to define the value.

Provide the `password` field if the Redis server requires a password. Both the hostname and password fields need to be set to the names of the environment variables in the target deployment that contain the host name and password respectively.

The `listName` parameter in the spec points to the Redis List that you want to monitor. The `listLength` parameter defines the average target value for the Horizontal Pod Autoscaler (HPA).

The `enableTLS` parameter if set to true allow a connection to a redis queue using tls, the default value for this parameter is false.

The `databaseIndex` parameter let the user select the redis database to use. If not specified, the default value is 0

### Authentication Parameters

You can authenticate by using a password.

**Connection Authentication:**

- `address` - The host and port for the Redis server (host:port format).

- `host` - The hostname of the Redis server. If specified, the `port` should also be specified

- `port` - The port of the Redis server. If specified, the `host` should also be specified

**Password Authentication:**

- `password` - Redis password to authenticate with

### Example

Here is an example of how to deploy a scaled object with the `redis` scale trigger which uses `TriggerAuthentication`.

You can also provide the `password` on the `ScaledObject` directly.

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
    deploymentName: votes
  triggers:
  - type: redis
    metadata:
      address: REDIS_ADDRESS
      listName: mylist
      listLength: "10"
    authenticationRef:
      name: keda-trigger-auth-redis-secret
```
