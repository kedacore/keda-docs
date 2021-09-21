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

- `connectionFromEnv` postgreSQL connection string that should point to environment variable with valid value

Alternatively, a user can specify individual
arguments (host, userName, password, etc.), and the scaler will form a connection string
internally.

- `host:` Service URL to postgresql. Note that you should use a full svc URL as KEDA will need to contact postgresql from a different namespace
- `userName:` Username for postgresql user
- `passwordFromEnv` Password for postgresql user
- `port:` Postgresql port
- `dbName:` Postgresql Database name
- `sslmode:` SSL policy for communicating with database

Finally, a user inserts a query that returns the desired value

- `query:` What query to poll postgresql with. Query must return an integer.
- `targetQueryValue` - a threshold that is used as `targetAverageValue` in HPA.
- `metricName` - an optional name to assign to the metric. If not set KEDA will generate a name based on either the connection string if set or the db name. If using more than one trigger it is required that all metricNames be unique.

This is an example of using a full connection string with `AIRFLOW_CONN_AIRFLOW_DB` set as `postgresql://test@localhost`:

```yaml
triggers:
- type: postgresql
  metadata:
    connectionFromEnv: AIRFLOW_CONN_AIRFLOW_DB
    query: "SELECT ceil(COUNT(*)::decimal / 16) FROM task_instance WHERE state='running' OR state='queued'"
    targetQueryValue: 1
    metricName: backlog_process_count #optional. Generated value would be `postgresql-postgresql---test@localhost`
```

While this is an example of specifying each parameter:

```yaml
triggers:
- type: postgresql
  metadata:
    userName: "kedaUser"
    passwordFromEnv: PG_PASSWORD
    host: postgres-svc.namespace.cluster.local #use the cluster-wide namespace as KEDA
                                                #lives in a different namespace from your postgres
    port: "5432"
    dbName: test_db_name
    sslmode: disable
    query: "SELECT ceil(COUNT(*)::decimal / 16) FROM task_instance WHERE state='running' OR state='queued'"
    targetQueryValue: 1
    metricName: backlog_process_count #optional. Generated value would be `postgresql-test_db_name`
```

### Authentication Parameters

You can authenticate by using a username and password or store the password within the connectionString.

**Connection String Authentication:**

- `connection` - Connection string for postgreSQL database

**Password Authentication:**

- `host:` Service URL to postgresql. Note that you should use a full svc URL as KEDA will need to contact postgresql from a different namespace
- `userName:` Username for postgresql user
- `password` Password for configured user to login to postgreSQL database variables.
- `port:` Postgresql port
- `dbName:` Postgresql Database name
- `sslmode:` SSL policy for communicating with database

### Example

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: airflow-worker
spec:
  scaleTargetRef:
    name: airflow-worker
  pollingInterval: 10   # Optional. Default: 30 seconds
  cooldownPeriod: 30    # Optional. Default: 300 seconds
  maxReplicaCount: 10   # Optional. Default: 100
  triggers:
    - type: postgresql
      metadata:
        connectionFromEnv: AIRFLOW_CONN_AIRFLOW_DB
        query: "SELECT ceil(COUNT(*)::decimal / 16) FROM task_instance WHERE state='running' OR state='queued'"
        targetQueryValue: 1
```
