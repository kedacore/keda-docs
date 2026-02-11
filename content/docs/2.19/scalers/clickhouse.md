+++
title = "ClickHouse"
availability = "v2.19+"
maintainer = "Community"
category = "Data & Storage"
description = "Scale applications based on ClickHouse query results."
go_file = "clickhouse_scaler"
+++

### Trigger Specification

This specification describes the `clickhouse` trigger that scales based on the results of a ClickHouse query.

The ClickHouse scaler allows for two connection options:

A user can provide a full connection string (often in the form of an environment variable secret).

- `connectionString` - ClickHouse connection string that should point to environment variable with valid value.

Alternatively, a user can specify individual arguments (host, username, password, etc.), and the scaler will form a connection string internally.

- `host` - Service URL to ClickHouse. Note that you should use a full svc URL as KEDA will need to contact ClickHouse from a different namespace.
- `port` - ClickHouse port. (Default: `9000`, Optional)
- `username` - Username for ClickHouse user. (Default: `default`, Optional)
- `password` - Password for ClickHouse user. Can reference an environment variable.
- `database` - ClickHouse database name. (Default: `default`, Optional)

Finally, a user inserts a query that returns the desired value.

- `query` - What query to poll ClickHouse with. Query must return a single numeric value.
- `targetQueryValue` - A threshold that is used as `targetValue` or `targetAverageValue` (depending on the trigger metric type) in HPA. (This value can be a float, Required when not using scaler as metric source)
- `activationTargetQueryValue` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional, This value can be a float)

> Note that the query must return a single numeric value. If the query has a possibility of returning `null`, a default value can be set using the `ifNull` or `coalesce` function. For example, `SELECT ifNull(column_name, 0) FROM table_name;`. See [ClickHouse documentation](https://clickhouse.com/docs/en/sql-reference/functions/conditional-functions#ifnull) for more information.

This is an example of using a full connection string with `CLICKHOUSE_CONN_STR` set as `clickhouse://user:pass@localhost:9000/default`:

```yaml
triggers:
- type: clickhouse
  metadata:
    connectionString: CLICKHOUSE_CONN_STR
    query: "SELECT COUNT(*) FROM task_queue WHERE status='pending'"
    targetQueryValue: "10"
    activationTargetQueryValue: "5"
```

While this is an example of specifying each parameter:

```yaml
triggers:
- type: clickhouse
  metadata:
    host: clickhouse-svc.namespace.cluster.local #use the cluster-wide namespace as KEDA
                                                 #lives in a different namespace from your ClickHouse
    port: "9000"
    username: "kedaUser"
    password: CLICKHOUSE_PASSWORD
    database: "analytics"
    query: "SELECT COUNT(*) FROM task_queue WHERE status='pending'"
    targetQueryValue: "10"
```

### Authentication Parameters

You can authenticate by using a password, or store the password within the connectionString.

**Connection String Authentication:**

- `connectionString` - Connection string for ClickHouse database.

**Password Authentication:**

- `host` - Service URL to ClickHouse. Note that you should use a fully qualified URL (including the namespace) as KEDA will need to contact ClickHouse from a different namespace.
- `username` - Username for ClickHouse user.
- `password` - Password for configured user to login to ClickHouse database.
- `port` - ClickHouse port.
- `database` - ClickHouse database name.

### Example

Here is an example of how to deploy a scaled object with the `clickhouse` scale trigger which uses `TriggerAuthentication`.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: clickhouse-secrets
  namespace: my-project
type: Opaque
data:
  clickhouse_conn_str: Y2xpY2tob3VzZTovL3VzZXI6cGFzc0Bsb2NhbGhvc3Q6OTAwMC9kZWZhdWx0 # base64 encoded value of clickhouse connectionString of format clickhouse://user:pass@localhost:9000/default
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-clickhouse-secret
  namespace: my-project
spec:
  secretTargetRef:
  - parameter: connectionString
    name: clickhouse-secrets
    key: clickhouse_conn_str
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: clickhouse-scaledobject
  namespace: my-project
spec:
  scaleTargetRef:
    name: worker
  triggers:
  - type: clickhouse
    metadata:
      query: "SELECT COUNT(*) FROM task_queue WHERE status='pending'"
      targetQueryValue: "10"
      activationTargetQueryValue: "5"
    authenticationRef:
      name: keda-trigger-auth-clickhouse-secret
```

Here is another example using individual connection parameters with `TriggerAuthentication`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: clickhouse-secrets
  namespace: my-project
type: Opaque
data:
  clickhouse_password: cGFzc3dvcmQ= # base64 encoded password
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-clickhouse-secret
  namespace: my-project
spec:
  secretTargetRef:
  - parameter: password
    name: clickhouse-secrets
    key: clickhouse_password
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: clickhouse-scaledobject
  namespace: my-project
spec:
  scaleTargetRef:
    name: worker
  triggers:
  - type: clickhouse
    authenticationRef:
      name: keda-trigger-auth-clickhouse-secret
    metadata:
      host: clickhouse-svc.namespace.cluster.local
      port: "9000"
      username: "kedaUser"
      database: "analytics"
      query: "SELECT COUNT(*) FROM task_queue WHERE status='pending'"
      targetQueryValue: "10"
```
