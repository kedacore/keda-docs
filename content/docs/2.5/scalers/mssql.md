+++
title = "MSSQL"
availability = "v2.2+"
maintainer = "Microsoft"
description = "Scale applications based on Microsoft SQL Server (MSSQL) query results."
go_file = "mssql_scaler"
+++

### Trigger Specification

This specification describes the `mssql` trigger that scales based on the results of a [Microsoft SQL Server](https://www.microsoft.com/sql-server/) (MSSQL) query result. This trigger supports local [MSSQL containers](https://hub.docker.com/_/microsoft-mssql-server) as well as SQL Server endpoints hosted in the cloud, such as [Azure SQL Database](https://azure.microsoft.com/services/sql-database/).

```yaml
triggers:
- type: mssql
  metadata:
    connectionStringFromEnv: MSSQL_CONNECTION_STRING
    query: "SELECT COUNT(*) FROM backlog WHERE state='running' OR state='queued'"
    targetValue: 1
    metricName: backlog_process_count # optional - the generated value would be `mssql-{sha256hash}`
```

> 💡 **NOTE:** The connection string format supported by this scaler has some incompatibilities with connection string formats supported by other platforms, like .NET. For example, the MSSQL instance's port number must be separated into its own `Port` property instead of adding it to the `Server` property. You can learn more about all the supported connection string formats for this mssql scaler [here](https://github.com/denisenkom/go-mssqldb#the-connection-string-can-be-specified-in-one-of-three-formats).

Alternatively, you configure connection parameters explicitly instead of providing a connection string:

```yaml
triggers:
- type: mssql
  metadata:
    username: "kedaUser"
    passwordFromEnv: MSSQL_PASSWORD
    host: mssqlinst.namespace.svc.cluster.local
    port: "1433" # optional
    database: test_db_name
    query: "SELECT COUNT(*) FROM backlog WHERE state='running' OR state='queued'"
    targetValue: 1
    metricName: backlog_process_count # optional - the generated value would be `mssql-test_db_name`
```

The `mssql` trigger always requires the following information:

- `query` - A [T-SQL](https://docs.microsoft.com/sql/t-sql/language-reference) query that returns a single numeric value. This can be a regular query or the name of a stored procedure.
- `targetValue` - A threshold that is used as `targetAverageValue` in the Horizontal Pod Autoscaler (HPA).

> Note that the query must return a single integer value. If the query has a possibility of returning `null`, a default value can be set using the `COALESCE` function. For example, `SELECT COALESCE(column_name, 0) FROM table_name;`. See [MSSQL documentation](https://learn.microsoft.com/en-us/sql/t-sql/language-elements/coalesce-transact-sql) for more information on the `COALESCE` function.

To connect to the MSSQL instance, you can provide either:

- `connectionStringFromEnv` - The name of an environment variable containing a valid MSSQL connection string.

Or provide more detailed connection parameters explicitly (a connection string will be generated for you at runtime):

- `host` - The hostname of the MSSQL instance endpoint.
- `port` - The port number of the MSSQL instance endpoint. (Default: 1433, Optional)
- `database` - The name of the database to query.
- `username` - The username credential for connecting to the MSSQL instance.
- `passwordFromEnv` - The name of an environment variable containing the password credential for connecting to the MSSQL instance.

When configuring with a connection string, you can use either a URL format (note the URL encoding of special characters):

```
sqlserver://user1:Password%231@example.database.windows.net:1433?database=AdventureWorks
```

Or the more traditional ADO format:

```
Server=example.database.windows.net;Port=1433;Database=AdventureWorks;Persist Security Info=False;User ID=user1;Password=Password#1;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
```

You can also optionally assign a name to the metric using the `metricName` value. If not specified, the `metricName` will be generated automatically based on trigger index and the `database` value (if specified), or the `host` value, or will be in the form `s{triggerIndex}-mssql-{sha256hash}` where `{sha256hash}` is a SHA-256 hash of the connection string.

### Authentication parameters

As an alternative to using environment variables, you can authenticate with the MSSQL instance using connection string or password authentication via `TriggerAuthentication` configuration.

**Connection string authentication:**

- `connectionString` - The connection string for the MSSQL instance.

**Password authentication:**

- `host` - The hostname of the MSSQL instance endpoint.
- `port` - The port number of the MSSQL instance endpoint. (default 1433)
- `database` - The name of the database to query.
- `username` - The username credential for connecting to the MSSQL instance.
- `password` - The password credential for connecting to the MSSQL instance.

### Example

The following is an example of how to deploy a scaled object with the `mssql` scale trigger that uses `TriggerAuthentication` and a connection string.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mssql-secrets
type: Opaque
data:
  mssql-connection-string: U2VydmVyPWV4YW1wbGUuZGF0YWJhc2Uud2luZG93cy5uZXQ7cG9ydD0xNDMzO0RhdGFiYXNlPUFkdmVudHVyZVdvcmtzO1BlcnNpc3QgU2VjdXJpdHkgSW5mbz1GYWxzZTtVc2VyIElEPXVzZXIxO1Bhc3N3b3JkPVBhc3N3b3JkIzE7RW5jcnlwdD1UcnVlO1RydXN0U2VydmVyQ2VydGlmaWNhdGU9RmFsc2U7 # base64 encoded value of MSSQL connectionString of format "Server=example.database.windows.net;port=1433;Database=AdventureWorks;Persist Security Info=False;User ID=user1;Password=Password#1;Encrypt=True;TrustServerCertificate=False;"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-mssql-secret
spec:
  secretTargetRef:
  - parameter: connectionString
    name: mssql-secrets
    key: mssql-connection-string
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: mssql-scaledobject
spec:
  scaleTargetRef:
    name: consumer # e.g. the name of the resource to scale
  triggers:
  - type: mssql
    metadata:
      targetValue: 1
      query: "SELECT COUNT(*) FROM backlog WHERE state='running' OR state='queued'"
    authenticationRef:
      name: keda-trigger-auth-mssql-secret
```
