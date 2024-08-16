+++
title = "Cassandra"
availability = "v2.5+"
maintainer = "Community"
category = "Data & Storage"
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

Since we are passing Cert and Key content as inputs to the scaler, we have to supply writable location for required GSSAPI configurations for the `keda-operator` container. 

##### `sasl/gssapi` in manager.yaml

If you use YAML declarations to deploy KEDA, add below volume mount and volume to supply writable location for required GSSAPI configurations for the `keda-operator` container.

```
          volumeMounts:
          - mountPath: /tmp/cassandra
            name: temp-cassandra-vol
            readOnly: false

      volumes:
      - name: temp-cassandra-vol
        emptyDir:
          medium: Memory
```

##### `sasl/gssapi` in keda-charts

If you use Helm Charts to deploy KEDA, add below volume mount and volume to supply writable location for required gssapi configurations.

```
volumes.keda.extraVolumeMounts
- mountPath: /tmp/cassandra
  name: temp-cassandra-vol
  readOnly: false

volumes.keda.extraVolumes
- name: temp-cassandra-vol
  emptyDir:
    medium: Memory
```

Once we have the writable mount path set up for the certificates and keys.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cassandra-secrets
type: Opaque
data:
  cassandra_password: CASSANDRA_PASSWORD
  tls: enable
  cert: <cert content | base64encoded>
  key: <key content | base64encoded>
  ## Optional parameter ca ##
  ca: <ca cert content | base64encoded>
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
  ## Optional parameter ca ##
  - parameter: ca
    name: cassandra-secrets
    key: ca
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
