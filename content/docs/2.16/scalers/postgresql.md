+++
title = "PostgreSQL"
availability = "v1.2+"
maintainer = "Community"
category = "Data & Storage"
description = "Scale applications based on a PostgreSQL query."
go_file = "postgresql_scaler"
+++

### Trigger Specification

This specification describes the `postgresql` trigger that scales based on a PostgreSQL query

The PostgreSQL scaler allows for three connection options:

A user can offer a full connection string
(often in the form of an environment variable secret).

- `connectionFromEnv` - PostgreSQL connection string that should point to environment variable with valid value.

Alternatively, a user can specify individual
arguments (host, userName, password, etc.), and the scaler will form a connection string
internally.

- `host` - Service URL to postgresql. Note that you should use a full svc URL as KEDA will need to contact postgresql from a different namespace.
- `userName` - Username for postgresql user.
- `passwordFromEnv` Password for postgresql user.
- `port` - Postgresql port.
- `dbName` - Postgresql Database name.
- `sslmode` - SSL policy for communicating with database.

It is also possible to leverage a `TriggerAuthentication` object having the `azure-workload`'s provider type to connect to an Azure Postgres Flexible Server resource through an UAMI Azure managed identity.  
More details and an example are provided down below.

Finally, a user inserts a query that returns the desired value.

- `query` - What query to poll postgresql with. Query must return an integer.
- `targetQueryValue` - A threshold that is used as `targetValue` or `targetAverageValue` (depending on the trigger metric type) in HPA. (This value can be a float)
- `activationTargetQueryValue` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional, This value can be a float)


> Note that the query must return a single integer value. If the query has a possibility of returning `null`, a default value can be set using the `COALESCE` function. For example, `SELECT COALESCE(column_name, 0) FROM table_name;`. See [PostgreSQL documentation](https://www.postgresql.org/docs/current/functions-conditional.html#FUNCTIONS-COALESCE-NVL-IFNULL) for more information on the `COALESCE` function.


This is an example of using a full connection string with `AIRFLOW_CONN_AIRFLOW_DB` set as `postgresql://test@localhost`:

```yaml
triggers:
- type: postgresql
  metadata:
    connectionFromEnv: AIRFLOW_CONN_AIRFLOW_DB
    query: "SELECT ceil(COUNT(*)::decimal / 16) FROM task_instance WHERE state='running' OR state='queued';"
    targetQueryValue: "1.1"
    activationTargetQueryValue: "5"
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
    targetQueryValue: "2.2"
```

### Authentication Parameters

You can authenticate by using a password, or store the password within the connectionString, or leverage Azure Access Token authentication to connect to a Azure Postgres Flexible Server.

**Connection String Authentication:**

- `connection` - Connection string for PostgreSQL database.

**Password Authentication:**

- `host` - Service URL to PostgreSQL. Note that you should use a fully qualified URL (including the namespace) as KEDA will need to contact PostgreSQL from a different namespace.
- `userName` - Username for PostgreSQL user.
- `password` Password for configured user to login to PostgreSQL database variables.
- `port` - PostgreSQL port.
- `dbName` - PostgreSQL Database name.
- `sslmode` - SSL policy for communicating with database.

#### Example

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

**Azure Access Token authentication:**

#### Prerequisites:
- The UAMI should be able to access the Azure Postgres Flexible Server, [refer to this link for more info](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/how-to-connect-with-managed-identity#create-an-azure-database-for-postgresql-flexible-server-user-for-your-managed-identity).
- The UAMI should be granted access to the table mentioned in the query performed by KEDA.  
This can be achieved by:
  - creating a group role to allow access to the particular schema where the table queried by KEDA is persisted, and then assign the newly created Postgres user identity from previous step to this group role.
  - granting permission on the table queried by KEDA to the newly created Postgres user from previous step, via a query that looks like  
  `GRANT ALL ON <TABLE_REF> TO "<AZURE_UAMI_NAME>";`.

Next, a user can specify individual arguments (host, userName, password, etc.), and the scaler will form a connection string internally. An access token, which will act as a password, will be retrieved each time KEDA performs its process.
  - `host` - FQDN of the Azure Postgres Flexible Server.
  - `userName` - Name of the UAMI Azure identity (`<AZURE_UAMI_NAME>`).
  - `port` - Postgresql port (the default value is `"5432"`, please have a look at the `Remarks` down below).
  - `dbName` - Postgresql Database name.
  - `sslmode` - SSL policy for communicating with database (the value should be `require`).


#### Remarks

- While the Azure Postgres Flexible Server resource provides a [`PGBouncer`](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-pgbouncer) feature which opens a port `6432` to interact with the server, this access token authentication's feature was not working properly while using the `PGBouncer` port, but it worked without issues while using the default server's port. Therefore, KEDA should use the Postgres server's default port, but the other applications (i.e. Airflow, ...) deployed on the same Kubernetes cluster can use the `PGBouncer` port.


#### Example

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: azure-pg-flex-auth
spec:
  podIdentity:
    provider: azure-workload
    # Optional-> identityId: <UAMI_IDENTITY_ID>
    # Optional-> identityTenantId: <UAMI_TENANT_ID>

---

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
      authenticationRef:
        name: azure-pg-flex-auth
      metadata:
        host: <AZURE_POSTGRES_FLEX_SERVER_FQDN>
        port: "5432"
        userName: <UAMI_NAME>
        dbName: <DB_NAME>
        sslmode: require
        query: "SELECT ceil(COUNT(*)::decimal / 16) FROM task_instance WHERE state='running' OR state='queued';"
        targetQueryValue: 1
```