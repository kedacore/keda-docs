+++
fragment = "content"
weight = 100
title = "Redis Lists"
background = "light"
+++

Scale applications based on Redis Lists.

**Availability:** v1.0+ | **Maintainer:** Community

<!--more-->

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
```

The `address` field in the spec holds the host and port of the redis server. This could be an external redis server or one running in the kubernetes cluster.

Provide the `password` field if the redis server requires a password. Both the hostname and password fields need to be set to the names of the environment variables in the target deployment that contain the host name and password respectively.

The `listName` parameter in the spec points to the Redis List that you want to monitor. The `listLength` parameter defines the average target value for the Horizontal Pod Autoscaler (HPA).

### Example

```yaml
apiVersion: keda.k8s.io/v1alpha1
kind: ScaledObject
metadata:
  name: redis-scaledobject
  namespace: keda-redis-test
  labels:
    deploymentName: keda-redis-node
spec:
  scaleTargetRef:
    deploymentName: keda-redis-node
  triggers:
  - type: redis
    metadata:
      address: REDIS_HOST # Required host:port format
      password: REDIS_PASSWORD
      listName: mylist # Required
      listLength: "5" # Required
```

## Using Trigger Authentication CRD

When using the Trigger Authentication CRD `secretTargetRef`, like the example below

```yaml
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
```    

The `TriggerAuthentication` namespace must be the same as your consumer Pod's namespace.

Where:

* `parameter` value must be the same as the scaler's expecting field.  In the case of Redis scaler, the Redis password is expected to be in the field `password`.
* `name` : the name of the kubernetes `Secret` manifest.
* `key`: the Opaque key defined in the `Secret` manifest.

Example below:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: votes-db-secret
  namespace: my-project
type: Opaque
data:
  redis_password: YWRtaW4=
```

The scaledObject definition must include `TriggerAuthentication` name in the `authenticationRef` as shown below:

```yaml
apiVersion: keda.k8s.io/v1alpha1
kind: ScaledObject
metadata:
  name: redis-scaledobject
  namespace: my-project
  labels:
    deploymentName: votes
spec:
  scaleTargetRef:
    deploymentName: votes
  triggers:
  - type: redis
    metadata:
      address: REDIS_ADDRESS # the environment Variable defined in the Pod, the value is in the format host:port
      listName: mylist # Required
      listLength: "10" # Required
    authenticationRef: 
      name: keda-trigger-auth-redis-secret       
```