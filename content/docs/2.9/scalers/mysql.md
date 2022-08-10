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
- `queryValue` - A threshold that is used as `targetValue` or `targetAverageValue` (depending on the trigger metric type) in HPA. (This value can be a float)
- `activationQueryValue` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional, This value can be a float)

To provide information about how to connect to MySQL you can provide:

- `connectionStringFromEnv` - MySQL connection string that should point to environment variable with valid value.

Or provide more detailed information:

- `host` - The host of the MySQL server.
- `port` - The port of the MySQL server.
- `dbName` - Name of the database.
- `username` - Username to authenticate with to MySQL database.
- `passwordFromEnv` - Password for the given user, this should be blank (no password) or point to an environment variable with the password.

Some parameters could be provided using environmental variables, instead of setting them directly in metadata. Here is a list of parameters you can use to retrieve values from environment variables:

- `hostFromEnv` - The host of the MySQL server, similar to `host`, but reads it from an environment variable on the scale target.
- `portFromEnv` - The port of the MySQL server, similar to `port`, but reads it from an environment variable on the scale target.

### Authentication Parameters

You can authenticate by using connection string or password authentication.

**Connection String Authentication:**

- `connectionString` - Connection string for MySQL database.

**Password Authentication:**

- `host` - The host of the MySQL server.
- `port` - The port of the MySQL server.
- `dbName` - Name of the database.
- `username` - Username to authenticate with to MySQL database.
- `password` - Password for configured user to login to MySQL database.
variables.

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
  mysql_conn_str: dXNlckB0Y3AobXlzcWw6MzMwNikvc3RhdHNfZGI= # base64 encoded value of mysql connectionString of format user@tcp(mysql:3306)/stats_db
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
      queryValue: "4.4"
      activationQueryValue: "5.4"
      query: "SELECT CEIL(COUNT(*) / 6) FROM task_instance WHERE state='running' OR state='queued'"
    authenticationRef:
      name: keda-trigger-auth-mysql-secret
```
