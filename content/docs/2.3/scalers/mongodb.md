+++
title = "MongoDB"
layout = "scaler"
maintainer = "Community"
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
      # Optional: The generated metric name would be mongodb-global-metric. Here mongodb- use as a prefix for metric name
      metricName: "global-metric"
```

Alternatively, you can configure connection parameters explicitly instead of providing a connection string:

```yaml
triggers:
  - type: mongodb
    metadata:
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
      # Optional: The generated metric name would be mongodb-global-metric. Here mongodb- use as a prefix for metric name.
      metricName: "global-metric"
```

>**NOTE:** If **metricName** is not set, then one is generated based on the values in trigger spec, for example: **mongodb-mongodb---test_user-test_password@xxx-27017-test-test_collection**

**Parameter list:**

The `mongodb` trigger always requires the following information:

- `dbName` - Name of the database.
- `collection` - Name of the collection.
- `query` - A MongoDB query that should return single numeric value.
- `queryValue` - A threshold that will define when scaling should occur.

To connect to the MongoDB server, you can provide either:

- `connectionStringFromEnv` - The name of an environment variable containing a valid MongoDB connection string for connectiing to the MongoDB server.

Or provide more detailed connection parameters explicitly (a connection string will be generated for you at runtime):

- `host` - The host name of the MongoDB server.
- `port` - The port number of the MongoDB server.
- `username` - Username to authenticate with to MongoDB database.
- `passwordFromEnv` - The name of an environment variable containing the password credential for connecting to the MongoDB server.

When configuring with a connection string, you can use this URL format:

```
mongodb://<username>:<password>@mongodb-svc.<namespace>.svc.cluster.local:27017/<database_name>
```

You can also optionally assign a name to the metric using the `metricName` value. If not specified, the `metricName` will be generated automatically based on masked version of the server hostname and collection name. For example: **mongodb-mongodb---test_user-test_password@xxx-27017-test-test_collection**. If using more than one trigger it is required that all `metricName`(s) be unique. The value will be prefixed with `mongodb-` .

### Authentication Parameters 

As an alternative to environment variables, You can authenticate with the MongoDB server by using connection string or password authentication via `TriggerAuthentication` or `ClusterTriggerAuthentication` configuration.

**Connection String Authentication:**

- `connectionString` - Connection string for MongoDB server.

**Password Authentication:**

- `password` - Password for the configured user to login to MongoDB server.

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
            - --connectStr=mongodb://test_user:test_password@mongoDB-svc.mongoDB.svc.cluster.local:27017/test
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
        metricName: "global-metric"
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
