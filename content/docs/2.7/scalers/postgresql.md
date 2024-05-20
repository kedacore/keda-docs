+++
title = "PostgreSQL"
availability = "v1.2+"
maintainer = "Community"
description = "Scale applications based on a PostgreSQL query."
go_file = "postgresql_scaler"
+++

### Trigger Specification

This specification describes the `postgresql` trigger that scales based on a PostgreSQL query

The PostgreSQL scaler allows for two connection options:

A user can offer a full connection string
(often in the form of an environment variable secret)

- `connectionFromEnv` - PostgreSQL connection string that should point to environment variable with valid value.

Alternatively, a user can specify individual
arguments (host, userName, password, etc.), and the scaler will form a connection string
internally.

- `host:` - Service URL to postgresql. Note that you should use a full svc URL as KEDA will need to contact postgresql from a different namespace.
- `userName:` - Username for postgresql user.
- `passwordFromEnv` Password for postgresql user.
- `port` - Postgresql port.
- `dbName` - Postgresql Database name.
- `sslmode` - SSL policy for communicating with database.

Finally, a user inserts a query that returns the desired value.

- `query` - What query to poll postgresql with. Query must return an integer.
- `targetQueryValue` - A threshold that is used as `targetValue` or `targetAverageValue` (depending on the trigger metric type) in HPA.
- `metricName` - Name to assign to the metric. If not set KEDA will generate a name based on either the connection string if set or the db name. If using more than one trigger it is required that all metricNames be unique. (Optional)

> Note that the query must return a single integer value. If the query has a possibility of returning `null`, a default value can be set using the `COALESCE` function. For example, `SELECT COALESCE(column_name, 0) FROM table_name;`. See [PostgreSQL documentation](https://www.postgresql.org/docs/current/functions-conditional.html#FUNCTIONS-COALESCE-NVL-IFNULL) for more information on the `COALESCE` function.

This is an example of using a full connection string with `AIRFLOW_CONN_AIRFLOW_DB` set as `postgresql://test@localhost`:

```yaml
triggers:
- type: postgresql
  metadata:
    connectionFromEnv: AIRFLOW_CONN_AIRFLOW_DB
    query: "SELECT ceil(COUNT(*)::decimal / 16) FROM task_instance WHERE state='running' OR state='queued';"
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
    query: "SELECT ceil(COUNT(*)::decimal / 16) FROM task_instance WHERE state='running' OR state='queued';"
    targetQueryValue: 1
    metricName: backlog_process_count #optional. Generated value would be `postgresql-test_db_name`
```

### Authentication Parameters

You can authenticate by using a password or store the password within the connectionString.

**Connection String Authentication:**

- `connection` - Connection string for PostgreSQL database.

**Password Authentication:**

- `host` - Service URL to PostgreSQL. Note that you should use a fully qualified URL (including the namespace) as KEDA will need to contact PostgreSQL from a different namespace.
- `userName` - Username for PostgreSQL user.
- `password` Password for configured user to login to PostgreSQL database variables.
- `port` - PostgreSQL port.
- `dbName` - PostgreSQL Database name.
- `sslmode` - SSL policy for communicating with database.

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
        query: "SELECT ceil(COUNT(*)::decimal / 16) FROM task_instance WHERE state='running' OR state='queued';"
        targetQueryValue: 1
```
