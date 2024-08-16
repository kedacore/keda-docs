+++
title = "MongoDB"
maintainer = "Community"
category = "Data & Storage"
description = "Scale applications based on MongoDB queries."
availability = "v2.1+"
go_file = "mongo_scaler"
+++

### Trigger Specification

This specification describes the `mongodb` trigger that scales based on result of MongoDB query.

```yaml
triggers:
  - type: mongodb
    metadata:
      # name of an environment variable containing a valid MongoDB connection string
      connectionStringFromEnv: MongoDB_CONNECTION_STRING
      # Required: database name
      dbName: "test"
      # Required: collection name
      collection: "test_collection"
      # Required: query expr, used by filter data
      query: '{"region":"eu-1","state":"running","plan":"planA"}'
      # Required: according to the number of query result, to scale the TargetRef
      queryValue: "1"
      # Optional: according to the number of query result, the scaler is active
      activationQueryValue: "1"
```

Alternatively, you can configure connection parameters explicitly instead of providing a connection string:

```yaml
triggers:
  - type: mongodb
    metadata:
      # scheme of the MongoDB server. if using MongoDB Altas, you can set it to "mongodb+srv"
      scheme: "mongodb"
      # host name of the MongoDB server. Example of mongodb service: "mongodb-svc.<namespace>.svc.cluster.local"
      host: mongodb-svc.default.svc.cluster.local
      # port number of the MongoDB server.
      port: "27017"
      # username credential for connecting to the MongoDB server
      username: test_user
      # name of an environment variable containing a valid password for connecting to the MongoDB server
      passwordFromEnv: MongoDB_Password
      # Required: database name
      dbName: "test"
      # Required: collection name
      collection: "test_collection"
      # Required: query expr, used by filter data
      query: '{"region":"eu-1","state":"running","plan":"planA"}'
      # Required: according to the number of query result, to scale the TargetRef
      queryValue: "1"
      # Optional: according to the number of query result, the scaler is active
      activationQueryValue: "1"
```

**Parameter list:**

The `mongodb` trigger always requires the following information:

- `dbName` - Name of the database.
- `collection` - Name of the collection.
- `query` - A MongoDB query that should return single numeric value.
- `queryValue` - A threshold that will define when scaling should occur.
- `activationQueryValue` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)

To connect to the MongoDB server, you can provide either:

- `connectionStringFromEnv` - The name of an environment variable containing a valid MongoDB connection string for connecting to the MongoDB server.

Or provide more detailed connection parameters explicitly (a connection string will be generated for you at runtime):

- `scheme` - The scheme of the MongoDB server, if using MongoDB Atlas, you can set it to `mongodb+srv`. (Default: `mongodb`, Optional)
- `host` - The host name of the MongoDB server.
- `port` - The port number of the MongoDB server.
- `username` - Username to authenticate with to MongoDB database.
- `passwordFromEnv` - The name of an environment variable containing the password credential for connecting to the MongoDB server.

When configuring with a connection string, you can use this URL format:

```
mongodb[+srv]://<username>:<password>@mongodb-svc.<namespace>.svc.cluster.local:27017/<database_name>
```


### Authentication Parameters

As an alternative to environment variables, You can authenticate with the MongoDB server by using connection string or password authentication via `TriggerAuthentication` or `ClusterTriggerAuthentication` configuration.

**Connection String Authentication:**

- `connectionString` - Connection string for MongoDB server.

**Password Authentication:**

- `scheme` - The scheme of the MongoDB server, if using MongoDB Atlas, you can set it to `mongodb+srv`. (Default: `mongodb`, Optional)
- `host` - The host name of the MongoDB server.
- `port` - The port number of the MongoDB server.
- `username` - Username to authenticate with to MongoDB database.
- `password` - Password for the configured user to login to MongoDB server.
- `dbName` - Name of the database.

### Example

Here is an example of how to deploy a scaled Job with the `MongoDB` scale trigger which uses `TriggerAuthentication`.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata:
  name: mongodb-job
spec:
  jobTargetRef:
    template:
      spec:
        containers:
          - name: mongodb-update
            image: 1314520999/mongodb-update:latest
            args:
            - --dataBase=test
            - --collection=test_collection
            imagePullPolicy: IfNotPresent
        restartPolicy: Never
    backoffLimit: 1
  pollingInterval: 30             # Optional. Default: 30 seconds
  maxReplicaCount: 30             # Optional. Default: 100
  successfulJobsHistoryLimit: 0   # Optional. Default: 100. How many completed jobs should be kept.
  failedJobsHistoryLimit: 10      # Optional. Default: 100. How many failed jobs should be kept.
  triggers:
    - type: mongodb
      metadata:
        dbName: "test"
        collection: "test_collection"
        query: '{"region":"eu-1","state":"running","plan":"planA"}'
        queryValue: "1"
      authenticationRef:
        name: mongodb-trigger
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: mongodb-trigger
spec:
  secretTargetRef:
    - parameter: connectionString
      name: mongodb-secret
      key: connect
---
apiVersion: v1
kind: Secret
metadata:
  name: mongodb-secret
type: Opaque
data:
  connect: bW9uZ29kYjovL3Rlc3RfdXNlcjp0ZXN0X3Bhc3N3b3JkQG1vbmdvZGItc3ZjLm1vbmdvREIuc3ZjLmNsdXN0ZXIubG9jYWw6MjcwMTcvdGVzdA==
```
