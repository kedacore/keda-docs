+++
title = "PostgreSQL"
layout = "scaler"
availability = "v1.2+"
maintainer = "Community"
description = "Scale applications based on a PostgreSQL query."
go_file = "postgresql_scaler"
+++

### Trigger Specification

This specification describes the `postgresql` trigger that scales based on a postgresql query

The Postgresql scaler allows for two connection options:

A user can offer a full connection string 
(often in the form of an environment variable secret)

- `connection` postgreSQL connection string that should point to environment variable with valid value

Alternatively, a user can specify individual
arguments (host, userName, password, etc.), and the scaler will form a connection string 
internally.

- `host:` Service URL to postgresql. Note that you should use a full svc URL as KEDA will need to contact postgresql from a different namespace
- `userName:` Username for postgresql user
- `password:` Password for postgresql user
- `port:` Postgresql port
- `dbName:` Postgresql Database name
- `sslmode:` SSL policy for communicating with database

Finally, a user inserts a query that returns the desired value

- `query:` What query to poll postgresql with. Query must return an integer.
- `targetQueryValue` - a threshold that is used as `targetAverageValue` in HPA.

This is an example of using a full connection string:

```yaml
triggers:
- type: postgresql
  metadata:
    connection: AIRFLOW_CONN_AIRFLOW_DB
    query: "SELECT ceil(COUNT(*)::decimal / 16) FROM task_instance WHERE state='running' OR state='queued'"
    targetQueryValue: 1
```

While this is an example of specifying each parameter:

```yaml
triggers:
- type: postgresql
  metadata:
    userName: "kedaUser"
    password: PG_PASSWORD
    host: postgres-svc.namespace.cluster.local #use the cluster-wide namespace as KEDA 
                                                #lives in a different namespace from your postgres
    port: "5432"
    dbName: postgresql
    sslmode: disable
    query: "SELECT ceil(COUNT(*)::decimal / 16) FROM task_instance WHERE state='running' OR state='queued'"
    targetQueryValue: 1
```

### Authentication Parameters

You can authenticate by using a password or store the password within the connectionString.

**Connection String Authentication:**

- `connection` - Connection string for postgreSQL database

**Password Authentication:**

- `password` - Password for configured user to login to postgreSQL database
variables.

### Example

```yaml
apiVersion: keda.k8s.io/v1alpha1
kind: ScaledObject
metadata:
  name: airflow-worker
spec:
  scaleTargetRef:
    deploymentName: airflow-worker
  pollingInterval: 10   # Optional. Default: 30 seconds
  cooldownPeriod: 30    # Optional. Default: 300 seconds
  maxReplicaCount: 10   # Optional. Default: 100
  triggers:
    - type: postgresql
      metadata:
        connection: AIRFLOW_CONN_AIRFLOW_DB
        query: "SELECT ceil(COUNT(*)::decimal / 16) FROM task_instance WHERE state='running' OR state='queued'"
        targetQueryValue: 1
```
