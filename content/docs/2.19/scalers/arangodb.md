+++
title = "ArangoDB"
availability = "v2.10+"
maintainer = "Community"
category = "Datastore"
description = "Scale applications based on ArangoDB query result."
go_file = "arangodb_scaler"
+++

### Trigger Specification

This specification describes the `arangodb` trigger that scales based on a ArangoDB query result. Here is an example of providing values in metadata:

```yaml
triggers:
- type: arangodb
  metadata:
    # Required fields:
    endpoints: "https://<endpoint1>:8529,https://<endpoint2>:8529" # Note: add one or more comma separated URL endpoints of all the coordinators
    query: FOR students IN class COLLECT WITH COUNT INTO length RETURN {"value":length} # Note: the query should return only a single numeric value in the JSON format {"value":<value>}
    queryValue: '3'
    dbName: gradesheet
    collection: class
    # Optional fields:
    activationQueryValue: '3'
    connectionLimit: 13 
    unsafeSsl: "false" #  Default is `false`, Used for skipping certificate check when having self-signed certs
```

**Parameter list:**

- `endpoints` - ArangoDB server endpoint URL or comma separated URL endpoints of all the coordinators. It can also be provided as an authentication parameter.
- `query` - ArangoDB query to scale for. Please note that the query should return only a single numeric value, i.e. an integer or a float, in the JSON format `{"value":<value>}`.
- `dbName` - Name of the database. It can also be provided as an authentication parameter.
- `collection` - Name of the collection.
- `threshold` - A threshold that will define when scaling should occur.
- `activationThreshold` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)
- `serverID` - The unique ArangoDB server ID. Only required if bearer JWT is being used. (Optional)
- `unsafeSsl` - Used for skipping certificate check e.g: using self-signed certs. (Values: `true`,`false`, Default: `false`, Optional)
- `connectionLimit` - Specify the max size of the active connection pool. (Optional)
- `authModes` - Authentication mode to be used. (Values: `bearer`,`basic`, Optional)

### Authentication Parameters

ArangoDB provides SSL/TLS configured out of the box. For authentication, it can be configured along with a Basic Auth or Bearer Auth.

You can use `TriggerAuthentication` CRD to configure the authentication. Specify `authModes` and other trigger parameters along with secret credentials in `TriggerAuthentication` as mentioned below:

**Bearer authentication:**
- `authModes`: It must contain `bearer` in case of Bearer Authentication. Specify this in trigger configuration.
- `bearerToken`: The token needed for authentication.

**Basic authentication:**
- `authModes`: It must contain `basic` in case of Basic Authentication. Specify this in trigger configuration.
- `username` - Provide the username to be used for basic authentication.
- `password` - Provide the password to be used for authentication. (Optional, For convenience this has been marked optional as many applications implement basic auth with a username as apikey and password as empty.)

Additionally, the parameters `endpoints` and `dbName` can also be provided as authentication parameters.

### Example

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: arangodb-scaledobject
  namespace: default
spec:
  maxReplicaCount: 12
  scaleTargetRef:
    name: arangodb-deployment
  triggers:
    - type: arangodb
      metadata:
        endpoints: https://<endpoint>:8529
        queryValue: '3'
        activationQueryValue: '3'
        dbName: gradesheet
        collection: class
        query: FOR students IN class COLLECT WITH COUNT INTO length RETURN {"value":length}
```

Here is an example of a arangodb scaler with Bearer Authentication, where the `Secret` and `TriggerAuthentication` are defined as follows:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-arangodb-secret
  namespace: default
data:
  bearerToken: "BEARER_TOKEN"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-arangodb-creds
  namespace: default
spec:
  secretTargetRef:
    - parameter: bearerToken
      name: keda-arangodb-secret
      key: bearerToken
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: arangodb-scaledobject
  namespace: default
spec:
  maxReplicaCount: 12
  scaleTargetRef:
    name: nginx
  triggers:
    - type: arangodb
      metadata:
        endpoints: https://<endpoint>:8529
        queryValue: '3'
        dbName: gradesheet
        collection: class
        query: FOR students IN class COLLECT WITH COUNT INTO length RETURN {"value":length}
        serverID: "uDmcE-0Zd"
        authModes: "bearer"
      authenticationRef:
        name: keda-arangodb-creds
```

Here is an example of a arangodb scaler with Basic Authentication, where the `Secret` and `TriggerAuthentication` are defined as follows:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-arangodb-secret
  namespace: default
data:
  username: dXNlcm5hbWU=
  password: cGFzc3dvcmQ=
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-arangodb-creds
  namespace: default
spec:
  secretTargetRef:
    - parameter: username
      name: keda-arangodb-secret
      key: username
    - parameter: password
      name: keda-arangodb-secret
      key: password
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: arangodb-scaledobject
  namespace: default
spec:
  maxReplicaCount: 12
  scaleTargetRef:
    name: nginx
  triggers:
    - type: arangodb
      metadata:
        endpoints: https://<endpoint>:8529
        queryValue: '3'
        dbName: gradesheet
        collection: class
        query: FOR students IN class COLLECT WITH COUNT INTO length RETURN {"value":length}
        authModes: "basic"
      authenticationRef:
        name: keda-arangodb-creds
```
