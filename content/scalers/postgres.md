+++
fragment = "content"
weight = 100
title = "PostgreSQL"
background = "light"
+++

Scale applications based on a PostgreSQL query

**Availability:** v1.2+ | **Maintainer:** Community

<!--more-->

### Trigger Specification

This specification describes the `postgres` trigger that scales based on a postgres query

The Postgres scaler allows for two connection options. 
Either a user can offer a full connection string 
(often in the form of an environment variable secret), or the user can specify individual
arguments (host, userName, password, etc.), and the scaler will form a connection string 
internally.

This is an example of using a full connection string:
```yaml
  triggers:
    - type: postgres
      metadata:
        connStr: AIRFLOW_CONN_AIRFLOW_DB
        query: "SELECT ceil(COUNT(*)::decimal / 16) FROM task_instance WHERE state='running' OR state='queued'"
```

While this is an example of specifying each parameter:

```yaml
  triggers:
    - type: postgres
      metadata:
        userName: "kedaUser"
        password: PG_PASSWORD
        host: postgres-svc.namespace.cluster.local #use the cluster-wide namespace as KEDA 
                                                   #lives in a different namespace from your postgres
        port: "5432"
        dbName: postgres
        sslmode: disable
        query: "SELECT ceil(COUNT(*)::decimal / 16) FROM task_instance WHERE state='running' OR state='queued'"
```


* **host:** Service URL to postgres. Note that you should use a full svc URL as KEDA will need to contact 
postgres from a different namespace
* **userName:** Username for postgres user
* **passworkd:** Password for postgres user
* **port:** Postgres port
* **dbName:** Postgres Database name
* **sslmode:** SSL policy for communicating with database
* **query:** What query to poll postgres with. Query must return an integer.

**Note:** If you include a connStr, the scaler will ignore all other connection parameters.

### Authentication Parameters

You can authenticate by using a password or store the password within the connStr.

**Password Authentication:**

- `password` - Postgres password to authenticate with

### Example

```yaml
apiVersion: keda.k8s.io/v1alpha1
kind: ScaledObject
metadata:
  name: airflow-worker
spec:
  scaleTargetRef:
    deploymentName: airflow-worker
  pollingInterval: 10   # Optional. Default: 30 seconds
  cooldownPeriod: 30    # Optional. Default: 300 seconds
  maxReplicaCount: 10   # Optional. Default: 100
  triggers:
    - type: postgres
      metadata:
        connStr: AIRFLOW_CONN_AIRFLOW_DB
        query: "SELECT ceil(COUNT(*)::decimal / 16) FROM task_instance WHERE state='running' OR state='queued'"

```
