+++
title = "MySQL"
layout = "scaler"
availability = "v1.2+"
maintainer = "Community"
description = "Scale applications based on MySQL query result."
go_file = "mysql_scaler"
+++

### Trigger Specification

This specification describes the `mysql` trigger that scales based on result of MySQL query.

The trigger always requires the following information:

- `query` - a MySQL query that should return single numeric value
- `queryValue` - a threshold that is used as `targetAverageValue` in HPA.

To provide information about how to connect to MySQL you can provide 
- `connectionString` MySQL connection string that should point to environment variable with valid value

Or provide more detailed information:

- `username` used to access MySQL database
- `password` used for the given user, this should be blank (no password) or point to an environment
 variable with the password
- `host` and `port` of the database
- `dbName` as name of the database

### Authentication Parameters

You can authenticate by using connection string or password authentication.

**Connection String Authentication:**

- `connection` - Connection string for MySQL database

**Password Authentication:**

- `connection` - Password for configured user to login to MySQL database
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
  mysql_conn_str: user@tcp(mysql:3306)/stats_db
---
apiVersion: keda.k8s.io/v1alpha1
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
apiVersion: keda.k8s.io/v1alpha1
kind: ScaledObject
metadata:
  name: mysql-scaledobject
  namespace: my-project
spec:
  scaleTargetRef:
    deploymentName: worker
  triggers:
  - type: mysql
    metadata:
      queryValue: "4"
      query: "SELECT CEIL(COUNT(*) / 6) FROM task_instance WHERE state='running' OR state='queued'"
    authenticationRef:
      connectionString: keda-trigger-auth-mysql-secret
```
