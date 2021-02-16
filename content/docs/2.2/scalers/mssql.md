+++
title = "MSSQL"
layout = "scaler"
availability = "v2.2+"
maintainer = "Microsoft"
description = "Scale applications based on Microsoft SQL Server (MSSQL) query results."
go_file = "mssql_scaler"
+++

### Trigger Specification

This specification describes the `mssql` trigger that scales based on the results of a [Microsoft SQL Server](https://www.microsoft.com/sql-server/) (MSSQL) query result.

```yaml
triggers:
- type: mssql
  metadata:
    connectionStringFromEnv: MSSQL_CONNECTION_STRING
    query: "SELECT CEILING(COUNT(*) / 16.0) FROM task_instance WHERE state='running' OR state='queued'"
    targetValue: 1
    metricName: backlog_process_count # optional - the generated value would be `mssql-{sha256hash}`
```

Alternatively, you configure connection parameters explicitly instead of providing a connection string:

```yaml
triggers:
- type: mssql
  metadata:
    username: "kedaUser"
    passwordFromEnv: MSSQL_PASSWORD
    host: mssql-instance.namespace.cluster.local
    port: "1433" # optional
    database: test_db_name
    query: "SELECT CEILING(COUNT(*) / 16.0) FROM task_instance WHERE state='running' OR state='queued'"
    targetValue: 1
    metricName: backlog_process_count # optional - the generated value would be `mssql-test_db_name`
```

The `mssql` trigger always requires the following information:

- `query` - a [T-SQL](https://docs.microsoft.com/sql/t-sql/language-reference) query that returns a single numeric value. This can be a regular query or the name of a stored procedure.
- `targetValue` - a threshold that is used as `targetAverageValue` in the Horizontal Pod Autoscaler (HPA).

To connect to the MSSQL instance you can provide either:

- `connectionStringFromEnv` - The name of an environment variable containing a valid MSSQL connection string.

Or provide more detailed connection parameters explicitly (a connection string will be generated for you at runtime):

- `host` - The hostname of the MSSQL instance endpoint.
- `port` - The port number of the MSSQL instance endpoint.
- `database` - The name of the database to query.
- `username` - The username credential for connecting to the MSSQL instance.
- `passwordFromEnv` - The name of an environment variable containing the password credential for connecting to the MSSQL instance.

When configuring with a connection string, you can use either a URL format (note the URL encoding of special characters):

```
sqlserver://user1:Password%231@example.database.windows.net:1433?database=AdventureWorks
```

Or the more traditional OLE DB format:

```
Server=example.database.windows.net;port=1433;Database=AdventureWorks;Persist Security Info=False;User ID=user1;Password=Password#1;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
```

You can also optionally assign a name to the metric using the `metricName` value. If not specified, the `metricName` will be generated automatically based on the `database` value (if specified), or the `host` value, or will be in the form `mssql-{sha256hash}` where `{sha256hash}` is a SHA-256 hash of the connection string.

### Authentication parameters

You can authenticate with the MSSQL instance using connection string or password authentication.

**Connection string authentication:**

- `connectionString` - The connection string for the MSSQL instance.

**Password authentication:**

- `password` - The password credential for connecting to the MSSQL instance.

### Example

The following is an example of how to deploy a scaled object with the `mssql` scale trigger that uses `TriggerAuthentication`.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mssql-secrets
  namespace: my-project
type: Opaque
data:
  mssql_conn_str: "Server=example.database.windows.net;port=1433;Database=AdventureWorks;Persist Security Info=False;User ID=user1;Password=Password#1;Encrypt=True;TrustServerCertificate=False;"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-mssql-secret
  namespace: my-project
spec:
  secretTargetRef:
  - parameter: connectionString
    name: mssql-secrets
    key: mssql_conn_str
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: mssql-scaledobject
  namespace: my-project
spec:
  scaleTargetRef:
    name: worker
  triggers:
  - type: mssql
    metadata:
      targetValue: 1
      query: "SELECT CEILING(COUNT(*) / 16.0) FROM task_instance WHERE state='running' OR state='queued'"
    authenticationRef:
      name: keda-trigger-auth-mssql-secret
```
