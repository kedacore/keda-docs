+++
title = "ClickHouse"
availability = "v2.21+"
maintainer = "Community"
category = "Data & Storage"
description = "Scale applications based on ClickHouse query results."
go_file = "clickhouse_scaler"
+++

### Trigger Specification

This specification describes the `clickhouse` trigger that scales based on the results of a ClickHouse query.

The ClickHouse scaler allows for two connection options:

A user can provide a full connection string via environment variable, `TriggerAuthentication` or `ClusterTriggerAuthentication`.

- `connectionStringFromEnv` - Name of an environment variable on the scale target containing a ClickHouse connection string, for example `clickhouse://user:pass@clickhouse-svc.my-project.svc.cluster.local:9000/default`. (Optional, Required when neither `connectionString` authentication nor `host` is provided)

Alternatively, a user can specify individual arguments (host, username, etc.), and the scaler will form a connection string internally.

- `host` - ClickHouse hostname, without a URL scheme or port. For a Kubernetes Service, use a fully qualified name such as `clickhouse-svc.my-project.svc.cluster.local` so KEDA can connect from another namespace. (Optional, Required when no connection string is provided)
- `port` - ClickHouse native protocol port. For TLS, specify the server's TLS port, usually `9440`; enabling TLS does not change the default port. (Default: `9000`, Optional)
- `username` - Username for ClickHouse user. (Default: `default`, Optional)
- `usernameFromEnv` - Name of an environment variable on the scale target containing the username. Used when `username` is not provided in trigger metadata or authentication parameters. (Optional)
- `passwordFromEnv` - Name of an environment variable on the scale target containing the password. The password can also be provided through authentication parameters. (Optional)
- `database` - ClickHouse database name. (Default: `default`, Optional)

When a connection string is provided, it takes precedence over the individual connection parameters.

The scaler also exposes optional connection pool configuration:

- `maxIdleConns` - Maximum number of idle connections in the pool. (Optional)
- `maxOpenConns` - Maximum number of open connections to the database. (Optional)
- `connMaxLifetime` - Maximum lifetime of a connection, e.g. `5m`, `30s`. (Optional)

These pool settings only override the driver's defaults when set to a positive value.

Finally, a user inserts a query that returns the desired value.

- `query` - What query to poll ClickHouse with. Query must return a single numeric value.
- `targetQueryValue` - A threshold that is used as `targetValue` or `targetAverageValue` (depending on the trigger metric type) in HPA. (This value can be a float, Required when not using scaler as metric source)
- `activationTargetQueryValue` - Target value for activating the scaler. Learn more about activation [here](../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional, This value can be a float)

> Note that the query must return a single numeric value. If the query returns no rows, the result is treated as `0`. If the query has a possibility of returning `null`, a default value can be set using the `ifNull` or `coalesce` function. For example, `SELECT ifNull(sumOrNull(column_name), 0) FROM table_name;`. See [ClickHouse documentation](https://clickhouse.com/docs/reference/functions/regular-functions/functions-for-nulls#ifnull) for more information.

This is an example of using a full connection string with `CLICKHOUSE_CONN_STR` set on the scale target as `clickhouse://user:pass@clickhouse-svc.my-project.svc.cluster.local:9000/default`:

```yaml
triggers:
- type: clickhouse
  metadata:
    connectionStringFromEnv: CLICKHOUSE_CONN_STR
    query: "SELECT COUNT(*) FROM task_queue WHERE status='pending'"
    targetQueryValue: "10"
    activationTargetQueryValue: "5"
```

This example specifies individual parameters, with `CLICKHOUSE_PASSWORD` set on the scale target:

```yaml
triggers:
- type: clickhouse
  metadata:
    host: clickhouse-svc.my-project.svc.cluster.local
    port: "9000"
    username: "kedaUser"
    passwordFromEnv: CLICKHOUSE_PASSWORD
    database: "analytics"
    query: "SELECT COUNT(*) FROM task_queue WHERE status='pending'"
    targetQueryValue: "10"
```

### Authentication Parameters

Use `TriggerAuthentication` or `ClusterTriggerAuthentication` to provide a connection string, password, or TLS settings.

The `host`, `port`, `username`, `database`, and connection pool parameters described above can also be supplied through authentication parameters. Trigger metadata takes precedence for those parameters.

**Connection String Authentication:**

- `connectionString` - ClickHouse connection string, for example `clickhouse://user:pass@clickhouse-svc.my-project.svc.cluster.local:9000/default`. Takes precedence over `connectionStringFromEnv`. (Optional, Required when neither `connectionStringFromEnv` nor `host` is provided)

**Password Authentication:**

- `password` - Password for the configured ClickHouse user. Takes precedence over `passwordFromEnv`. (Optional)

**TLS Authentication:**

The following parameters are read from authentication parameters. Set `tls` to `"true"` to use custom CA or client certificates. For a connection string, TLS can also be enabled with `?secure=true`.

- `tls` - Enable TLS connection. (Values: `true`, `false`, Default: `false`, Optional)
- `cert` - PEM-encoded client certificate for TLS authentication. (Optional, Required when `key` is provided and `tls` is `true`)
- `key` - PEM-encoded client private key for TLS authentication. (Optional, Required when `cert` is provided and `tls` is `true`)
- `keyPassword` - Password for an encrypted client private key. (Optional)
- `ca` - PEM-encoded CA certificate used to verify the server certificate. Uses the system trust store when omitted. (Optional)
- `unsafeSsl` - Skip TLS certificate verification. (Values: `true`, `false`, Default: `false`, Optional)

### Example

Here is an example of how to deploy a scaled object with the `clickhouse` scale trigger which uses `TriggerAuthentication`.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: clickhouse-secrets
  namespace: my-project
type: Opaque
stringData:
  clickhouse_conn_str: "clickhouse://user:pass@clickhouse-svc.my-project.svc.cluster.local:9000/default"
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
stringData:
  clickhouse_password: "password"
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
      host: clickhouse-svc.my-project.svc.cluster.local
      port: "9000"
      username: "kedaUser"
      database: "analytics"
      query: "SELECT COUNT(*) FROM task_queue WHERE status='pending'"
      targetQueryValue: "10"
```

For TLS with a custom CA, create a Secret in the same namespace as the `ScaledObject`, using the CA certificate in `ca.crt` and replacing the example password:

```console
kubectl create secret generic clickhouse-tls-secret --namespace my-project \
  --from-literal=tls=true --from-literal=password='password' --from-file=ca=ca.crt
```

Reference its TLS settings and password through `TriggerAuthentication`, and specify the ClickHouse native TLS port:

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-clickhouse-tls
  namespace: my-project
spec:
  secretTargetRef:
  - parameter: tls
    name: clickhouse-tls-secret
    key: tls
  - parameter: ca
    name: clickhouse-tls-secret
    key: ca
  - parameter: password
    name: clickhouse-tls-secret
    key: password
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
      name: keda-trigger-auth-clickhouse-tls
    metadata:
      host: clickhouse-svc.my-project.svc.cluster.local
      port: "9440"
      username: "kedaUser"
      database: "analytics"
      query: "SELECT COUNT(*) FROM task_queue WHERE status='pending'"
      targetQueryValue: "10"
```

For a server certificate trusted by the system trust store, omit `ca`. For mutual TLS, add the PEM-encoded client certificate and private key to the Secret and map them to `cert` and `key` in `secretTargetRef`. Both must be provided together. If the private key is encrypted, also map its password to `keyPassword`.
