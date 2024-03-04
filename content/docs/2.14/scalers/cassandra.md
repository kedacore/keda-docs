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
      activationTargetQueryValue: "10"
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
- `activationTargetQueryValue` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)

### Authentication Parameters

You can authenticate by using a password via `TriggerAuthentication` configuration.

**Password Authentication:**

- `password` - Password for configured user to log in to the Cassandra instance.
- `tls` - To enable SSL auth for Cassandra session, set this to enable. If not set, TLS for Cassandra is not used. (Values: enable, disable, Default: disable, Optional).
- `cert` - Certificate path for client authentication. Mandatory if tls enabled. (Optional)
- `key` - Key path for client authentication. Mandatory if tls enabled. (Optional)

### Example with no TLS auth

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
    authenticationRef:
      name: keda-trigger-auth-cassandra-secret
```

### Example with TLS auth

Since we are passing Cert and Key Path as inputs to the scaler, we have to mount cert and key to a path in keda operator. Update secret 'kedaorg-certs' which is in keda namespace to add new cert and key as below.

```yaml
data:
  ca.crt: <STRICTLY DO NOT MODIFY THIS>
  ca.key: <STRICTLY DO NOT MODIFY THIS>
  tls.crt: <STRICTLY DO NOT MODIFY THIS>
  tls.key: <STRICTLY DO NOT MODIFY THIS>
  cassandra-server1-cert.pem: <add cassandra server 1 cert content>
  cassndra-server1-key.pem: <add cassandra server 1 key content>
  #Similarly we can add any number of certs and keys based on no of differnt cassandra server connections
  cassandra-server2-cert.pem: <add cassandra server 2 cert content>
  cassndra-server2-key.pem: <add cassandra server 2 key content>
  ...
```

Once we add the certs to the above secret. Upon restart of keda-operator. New certs are mounted to /certs/ path. 

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cassandra-secrets
type: Opaque
data:
  cassandra_password: CASSANDRA_PASSWORD
  tls: enable
  cert: </certs/cassandra-server1-cert.pem | base64encoded>
  key: </certs/cassandra-server1-key.pem | base64encoded>
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
  - parameter: tls
    name: cassandra-secrets
    key: tls
  - parameter: cert
    name: cassandra-secrets
    key: cert
  - parameter: key
    name: cassandra-secrets
    key: key
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
    authenticationRef:
      name: keda-trigger-auth-cassandra-secret
```
