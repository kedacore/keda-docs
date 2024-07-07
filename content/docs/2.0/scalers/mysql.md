+++
title = "MySQL"
availability = "v1.2+"
maintainer = "Community"
description = "Scale applications based on MySQL query result."
go_file = "mysql_scaler"
+++

### Trigger Specification

This specification describes the `mysql` trigger that scales based on result of MySQL query.

The trigger always requires the following information:

- `query` - A MySQL query that should return single numeric value.
- `queryValue` - A threshold that is used as `targetAverageValue` in HPA.

> Note that the query must return a single integer value. If the query has a possibility of returning `null`, a default value can be set using the `COALESCE` function. For example, `SELECT COALESCE(column_name, 0) FROM table_name;`. See [MySQL documentation](https://dev.mysql.com/doc/refman/8.4/en/comparison-operators.html#function_coalesce) for more information on the `COALESCE` function.

To provide information about how to connect to MySQL you can provide:

- `connectionStringFromEnv` MySQL connection string that should point to environment variable with valid value

Or provide more detailed information:

- `host` - The host of the MySQL server.
- `port` - The port of the MySQL server.
- `dbName` - Name of the database.
- `username` - Username to authenticate with to MySQL database.
- `passwordFromEnv` - Password for the given user, this should be blank (no password) or point to an environment
 variable with the password.

Some parameters could be provided using environmental variables, instead of setting them directly in metadata. Here is a list of parameters you can use to retrieve values from environment variables:

- `hostFromEnv` - The host of the MySQL server, similar to `host`, but reads it from an environment variable on the scale target.
- `portFromEnv` - The port of the MySQL server, similar to `port`, but reads it from an environment variable on the scale target.
- `usernameFromEnv` - The username for connecting with host of the MySQL server, similar to `username`, but reads it from an environment variable on the scale target.

### Authentication Parameters

You can authenticate by using connection string or password authentication.

**Connection String Authentication:**

- `connectionString` - Connection string for MySQL database.

**Password Authentication:**

- `password` - Password for configured user to login to MySQL database variables.

### Example

Here is an example of how to deploy a scaled object with the `mysql` scale trigger which uses `TriggerAuthentication`.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mysql-secrets
  namespace: my-project
type: Opaque
data:
  mysql_conn_str: dXNlckB0Y3AobXlzcWw6MzMwNikvc3RhdHNfZGI= # base64 encoded value of mysql connectionString of format user:password@tcp(mysql:3306)/stats_db
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-mysql-secret
  namespace: my-project
spec:
  secretTargetRef:
  - parameter: connectionString
    name: mysql-secrets
    key: mysql_conn_str
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: mysql-scaledobject
  namespace: my-project
spec:
  scaleTargetRef:
    name: worker
  triggers:
  - type: mysql
    metadata:
      queryValue: "4"
      query: "SELECT CEIL(COUNT(*) / 6) FROM task_instance WHERE state='running' OR state='queued'"
    authenticationRef:
      name: keda-trigger-auth-mysql-secret
```
