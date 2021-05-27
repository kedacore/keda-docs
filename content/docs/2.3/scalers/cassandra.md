+++
title = "Cassandra"
availability = "v2.3+"
maintainer = "Community"
description = "Scale applications based on Cassandra query results."
layout = "scaler"
go_file = "cassandra_scaler"
+++

### Trigger Specification

This specification describes the `cassandra` trigger that scales based on the results of a Cassandra query result.

```yaml
triggers:
  - type: cassandra
    metadata:
      username: "cassandra"
      clusterIPAddress: "cassandra.default.svc.cluster.local:9042"
      consistency: "Quorum" # Optional: If not set by the user the default value will be `gocql.One`.
      protocolVersion: "4" # Optional: If not set by the user the default value will be `4`.
      keyspace: "testing" # Optional: Used for generating the metricName.
      query: "SELECT COUNT(*) FROM testing.test_table;"
      targetQueryValue: "1"
      metricName: "test_table-count" # Optional: If not set by the user the generated value would be `cassandra-<KEYSPACE>`, or if keyspace is not set either the default value would be just `cassandra`.
```

**Parameter list:**

- `username` - The username credential for connecting to the Cassandra instance.
- `clusterIPAddress` - The IP address or the host name of the Cassandra instance, with port number (optional).
- `consistency` - Configuration for a session or per individual read operation.
- `protocolVersion` - CQL Binary Protocol.
- `keyspace` - The name of the keyspace used in Cassandra.
- `query` - A Cassandra query that should return single numeric value.
- `targetQueryValue` - The threshold value that is provided by the user and used as `targetAverageValue` in the Horizontal Pod Autoscaler (HPA).
- `metricName` - An optional name to assign to the metric. If not set KEDA will generate a name based on the `keyspace`. If using more than one trigger it is required that all metricNames be unique.

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
    name: example
  triggers:
  - type: cassandra
    metadata:
      username: "cassandra"
      clusterIPAddress: "cassandra.default.svc.cluster.local:9042"
      consistency: "Quorum"
      protocolVersion: "4"
      keyspace: "testing"
      query: "SELECT COUNT(*) FROM testing.test_table;"
      targetQueryValue: "1"
      metricName: "test_table-count"
    authenticationRef:
      name: keda-trigger-auth-cassandra-secret      
```
