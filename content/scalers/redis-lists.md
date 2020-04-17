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

The `address` field in the spec holds the host and port of the redis server. This could be an external redis server or one running in the kubernetes cluster.

As an alternative to the `address` field the user can specify `host` and `port` parameters. 

Provide the `password` field if the redis server requires a password. Both the hostname and password fields need to be set to the names of the environment variables in the target deployment that contain the host name and password respectively.

The `listName` parameter in the spec points to the Redis List that you want to monitor. The `listLength` parameter defines the average target value for the Horizontal Pod Autoscaler (HPA).

The `enableTLS` parameter if set to true allow a connection to a redis queue using tls, the default value for this parameter is false.

The `databaseIndex` parameter let the user select the redis database to use. If not specified, the default value is 0

### Authentication Parameters

You can authenticate by using a password.

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
apiVersion: keda.k8s.io/v1alpha1
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
apiVersion: keda.k8s.io/v1alpha1
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
