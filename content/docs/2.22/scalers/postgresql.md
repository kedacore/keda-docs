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
Similarily a `TriggerAuthentication` object having the `aws` provider type can be used to connect via [IAM database authentication](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html) to an RDS Instance without storing a database password.
More details and an example are provided down below.

Finally, a user inserts a query that returns the desired value.

- `query` - What query to poll postgresql with. Query must return a numeric value (integers and floats are both supported).
- `targetQueryValue` - A threshold that is used as `targetValue` or `targetAverageValue` (depending on the trigger metric type) in HPA. (This value can be a float)
- `activationTargetQueryValue` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional, This value can be a float)


> Note that the query must return a single numeric value (integers and floats are both supported). If the query has a possibility of returning `null`, a default value can be set using the `COALESCE` function. For example, `SELECT COALESCE(column_name, 0) FROM table_name;`. See [PostgreSQL documentation](https://www.postgresql.org/docs/current/functions-conditional.html#FUNCTIONS-COALESCE-NVL-IFNULL) for more information on the `COALESCE` function.


This is an example of using a full connection string with `AIRFLOW_CONN_AIRFLOW_DB` set as `postgresql://test@localhost`:

```yaml
triggers:
- type: postgresql
  metadata:
    connectionFromEnv: AIRFLOW_CONN_AIRFLOW_DB
    query: "SELECT ceil(COUNT(*)::decimal / 16) FROM task_instance WHERE state IN ('running', 'queued');"
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
    host: postgres-svc.namespace.cluster.local # use the cluster-wide namespace as KEDA, lives in a different namespace from your postgres
    port: "5432"
    dbName: test_db_name
    sslmode: disable
    query: "SELECT ceil(COUNT(*)::decimal / 16) FROM task_instance WHERE state IN ('running', 'queued');"
    targetQueryValue: "2.2"
```

### Authentication Parameters

You can authenticate by using a password, storing the password within the connectionString, leveraging Azure Access Token authentication to connect to an Azure Postgres Flexible Server, or leveraging AWS IAM database authentication to connect to an AWS RDS or Aurora Postgres database.

**Connection String Authentication:**

- `connection` - Connection string for PostgreSQL database.

**Password Authentication:**

- `host` - Service URL to PostgreSQL. Note that you should use a fully qualified URL (including the namespace) as KEDA will need to contact PostgreSQL from a different namespace.
- `userName` - Username for PostgreSQL user.
- `password` Password for configured user to login to PostgreSQL database variables.
- `port` - PostgreSQL port.
- `dbName` - PostgreSQL Database name.
- `sslmode` - SSL policy for communicating with database.
- `sslrootcert` - (Optional) Path to a file in the KEDA operator container with the CA certificates used to verify the server certificate when `sslmode` is `verify-ca` or `verify-full`.

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
        query: "SELECT ceil(COUNT(*)::decimal / 16) FROM task_instance WHERE state IN ('running', 'queued');"
        targetQueryValue: 1
```

**Azure Access Token authentication:**

#### Prerequisites:

- The UAMI should be able to access the Azure Postgres Flexible Server, [refer to this link for more info](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/how-to-connect-with-managed-identity#create-an-azure-database-for-postgresql-flexible-server-user-for-your-managed-identity).
- The UAMI should be granted access to the table mentioned in the query performed by KEDA.
This can be achieved by:
  - creating a group role to allow access to the particular schema where the table queried by KEDA is persisted, and then assign the newly created Postgres user identity from previous step to this group role.
  - granting permission on the table queried by KEDA to the newly created Postgres user from previous step, via a query that looks like `GRANT ALL ON <TABLE_REF> TO "<AZURE_UAMI_NAME>";`.

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
        query: "SELECT ceil(COUNT(*)::decimal / 16) FROM task_instance WHERE state IN ('running', 'queued');"
        targetQueryValue: 1
```

**AWS RDS IAM authentication:**

KEDA signs a short-lived [IAM authentication token](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.Connecting.html) and uses it as the password for every new connection to the database. It uses the same AWS identity options as the other AWS scalers, see the [AWS pod identity](./../authentication-providers/aws.md) authentication provider.

#### Prerequisites:

- [IAM database authentication](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.Enabling.html) is enabled on the RDS DB instance or Aurora DB cluster.
- A dedicated, read-only database user for KEDA that can log in with IAM authentication and can read the table used in the query:
  ```sql
  CREATE USER keda_reader WITH LOGIN;
  GRANT rds_iam TO keda_reader;
  GRANT SELECT ON <TABLE_REF> TO keda_reader;
  ```
- An IAM role that KEDA uses allowing `rds-db:connect` only for that database user. Use the DB instance resource ID (`db-...`) or the Aurora cluster resource ID (`cluster-...`) in the ARN, not the instance name:
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": "rds-db:connect",
        "Resource": "arn:aws:rds-db:<REGION>:<ACCOUNT_ID>:dbuser:<DB_RESOURCE_ID>/keda_reader"
      }
    ]
  }
  ```

#### Choosing the AWS identity

Set one of the following on the `podIdentity` of the `TriggerAuthentication`:
- `roleArn` - KEDA assumes this role.
- `identityOwner: workload` - KEDA assumes the IAM role of the scaled workload's service account.
- `identityOwner: keda` - KEDA uses the IAM role of the KEDA operator. Unlike the other AWS scalers, this has to be set explicitly, so the operator's role is never used by default to connect to a database.

The trigger fails if none of these is set.

#### Parameters

- `host` - Endpoint of the RDS DB instance, Aurora DB cluster or Aurora DB instance. Only a single host is supported.
- `port` - PostgreSQL port.
- `userName` - Database user that is granted the `rds_iam` role (`keda_reader` in the above example).
- `dbName` - PostgreSQL Database name.
- `sslmode` - SSL policy for communicating with database. Must be `verify-full`.
- `awsRegion` - AWS Region of the database, used to sign the token.
- `ca` - (Optional, mutex with `sslrootcert`) PEM-encoded CA certificates used to verify the server certificate, typically the [RDS CA bundle](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html#UsingWithRDS.SSL.CertificatesAllRegions) stored in a Secret. Only available in `TriggerAuthentication`.
- `sslrootcert` - (Optional, mutex with `ca`, default: `/etc/keda/certs/rds-global-bundle.pem`) Path to a file in the KEDA operator container with the CA certificates used to verify the server certificate.

If neither `ca` nor `sslrootcert` is set, the CA bundle has to be mounted into the KEDA operator container at `/etc/keda/certs/rds-global-bundle.pem`. The trigger fails if no CA bundle is found; KEDA does not fall back to the system certificates.

Neither `connection` or `password` can be used with AWS RDS IAM authentication.

#### Notes

- The token is only checked when a connection is established, so open connections keep working after the token expires. Each new connection gets a newly signed token.

#### Example

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: rds-ca-bundle
type: Opaque
stringData:
  # Contents of https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
  ca.pem: |
    -----BEGIN CERTIFICATE-----
    ...
    -----END CERTIFICATE-----

---

apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: aws-rds-iam-auth
spec:
  podIdentity:
    provider: aws
    roleArn: <KEDA_RDS_ROLE_ARN>
  secretTargetRef:
    - parameter: ca
      name: rds-ca-bundle
      key: ca.pem

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
        name: aws-rds-iam-auth
      metadata:
        host: <DB_ENDPOINT>  # example: mydb.abc123.us-east-2.rds.amazonaws.com
        port: "5432"
        userName: keda_reader
        dbName: <DB_NAME>
        sslmode: verify-full
        awsRegion: <REGION>  # example: us-east-2
        query: "SELECT ceil(COUNT(*)::decimal / 16) FROM task_instance WHERE state IN ('running', 'queued');"
        targetQueryValue: 1
```
