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
      # Required: database name
      dbName: "test"
      # Required: collection name
      collection: "test_collection"
      # Required: query expr, used by filter data
      query: '{"region":"eu-1","state":"running","plan":"planA"}'
      # Required: according to the number of query result, to scale job
      queryValue: "1"
      # Optional: This value will default to a masked version of the host and collection name if not set by the user (metrics name value would be then `mongodb-https---xxx-test_collection`)
      metricName: "global-metric"
```

**Parameter list:**

- `dbName`  - Name of the database
- `collection` - Name of the collection
- `query` - A MongoDB query that should return single numeric value
- `queryValue` - A threshold that will define when scaling should occur
- `metricName` - An optional name to assign to the metric. If not set KEDA will generate a name based on masked version of the server hostname and collection name. If using more than one trigger it is required that all `metricName`(s) be unique.

To provide information about how to connect to MongoDB you can provide

- `connectionStringFromEnv` - A MongoDB connection string that should point to environment variable with valid value

Or provide more detailed information:

- `host` - The host of the MongoDB server
- `port` - The port of the MongoDB server
- `username` - Username to authenticate with to MongoDB database
- `passwordFromEnv` - Password for the given user

### Authentication Parameters 

You can authenticate by using connection string or password authentication.

**Connection String Authentication:**

- `connectionString`  - Connection string for MongoDB database

**Password Authentication:**

- `password` - Password for the configured user to login to MongoDB database variables.

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
