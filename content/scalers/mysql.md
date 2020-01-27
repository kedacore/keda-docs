+++
fragment = "content"
weight = 100
title = "MySQL"
background = "light"
+++

Scale applications based on MySQL query result.

**Availability:** v1.2+ | **Maintainer:** Community

<!--more-->

### Trigger Specification

This specification describes the `mysql` trigger that scales based on result of MySQL query.

The trigger always requires the following information:

- `query` - a MySQL query that should return single numeric value
- `queryValue` - a threshold that is used as `targetAverageValue` in HPA.

to provide information about how to connect to MySQL you can provide 
- `connectionString` MySQL connection string that should point to environment variable with valid value

or

- `username` used to access MySQL database
- `password` used for the given user, this should be blank (no password) or point to an environment
 variable with the password
- `host` and `port` of the database
- `dbName` as name of the database

#### Using `connectionString`
One option to connect to MySQL database is to use dsn connection string from environment variable:
```yaml
triggers:
  - type: mysql
    metadata:
      connectionString: "SQL_CONN_STR" // SQL_CONN_STR env variable should point to valid connection string
      queryValue: "4"
      query: "SELECT CEIL(COUNT(*) / 6) FROM task_instance WHERE state='running' OR state='queued'"
```

#### Using authentication parameters
Other possibility is to pass all required parameters to build a new connection string:
```yaml
triggers:
  - type: mysql
    metadata:
      username: "root"
      password: "MYSQL_PASSWORD" // MYSQL_PASSWORD env variable should point to the password
      host: "mysql"
      port: "3306"
      dbName: "stats_db"
      queryValue: "4"
      query: "SELECT CEIL(COUNT(*) / 6) FROM task_instance WHERE state='running' OR state='queued'"
```

### Example

Here is an example of how to deploy a scaled object with the `mysql` scale trigger which uses
 `TriggerAuthentication`.

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
  labels:
    deploymentName: worker
spec:
  scaleTargetRef:
    deploymentName: worker
  triggers:
  - type: redis
    metadata:
      queryValue: "4"
      query: "SELECT CEIL(COUNT(*) / 6) FROM task_instance WHERE state='running' OR state='queued'"
    authenticationRef:
      connectionString: keda-trigger-auth-mysql-secret
```
