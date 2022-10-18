+++
title = "Cassandra"
availability = "v2.5+"
maintainer = "Community"
description = "Scale applications based on Cassandra query results."
go_file = "cassandra_scaler"
+++

### Trigger Specification

This specification describes the `cassandra` trigger that scales based on the outputs of a Cassandra query.

```yaml
triggers:
  - type: cassandra
    metadata:
      username: "cassandra"
      port: "9042"
      clusterIPAddress: "cassandra.default"
      consistency: "Quorum"
      protocolVersion: "4"
      keyspace: "test_keyspace"
      query: "SELECT COUNT(*) FROM test_keyspace.test_table;"
      targetQueryValue: "1"
      metricName: "test_keyspace"
```

**Parameter list:**

- `username` - The username credential for connecting to the Cassandra instance.
- `port` - The port number of the Cassandra instance. (Optional, Can be set either here or in `clusterIPAddress`)
- `clusterIPAddress` - The IP address or the host name of the Cassandra instance.
- `consistency` - Configuration for a session or per individual read operation. (Values: `LOCAL_ONE`, `LOCAL_QUORUM`, `EACH_QUORUM`, `LOCAL_SERIAL`, `ONE`, `TWO`, `THREE`, `QUORUM`, `SERIAL`, `ALL`, Default: `ONE`, Optional)
- `protocolVersion` - CQL Binary Protocol. (Default: `4`, Optional)
- `keyspace` - The name of the keyspace used in Cassandra.
- `query` - A Cassandra query that should return single numeric value.
- `targetQueryValue` - The threshold value that is provided by the user and used as `targetValue` or `targetAverageValue` (depending on the trigger metric type) in the Horizontal Pod Autoscaler (HPA).
- `metricName` - Name to assign to the metric. (Default: `s<X>-cassandra-<KEYSPACE>`, Optional, In case of `metricName` is specified, it will be used to generate the `metricName` like this: `s<X>-cassandra-<METRICNAME>`, where `<X>` is the index of the trigger in a ScaledObject)

### Authentication Parameters

You can authenticate by using a password via `TriggerAuthentication` configuration.

**Password Authentication:**

- `password` - Password for configured user to login to the Cassandra instance.

### Example

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cassandra-secrets
type: Opaque
data:
  cassandra_password: CASSANDRA_PASSWORD
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-cassandra-secret
spec:
  secretTargetRef:
  - parameter: password
    name: cassandra-secrets
    key: cassandra_password
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: cassandra-scaledobject
spec:
  scaleTargetRef:
    name: nginx-deployment
  triggers:
  - type: cassandra
    metadata:
      username: "cassandra"
      port: "9042"
      clusterIPAddress: "cassandra.default"
      consistency: "Quorum"
      protocolVersion: "4"
      query: "SELECT COUNT(*) FROM test_keyspace.test_table;"
      targetQueryValue: "1"
      metricName: "test_keyspace"
    authenticationRef:
      name: keda-trigger-auth-cassandra-secret
```
