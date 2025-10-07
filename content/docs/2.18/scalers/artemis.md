+++
title = "ActiveMQ Artemis"
availability = "v1.5+"
maintainer = "Community"
category = "Messaging"
description = "Scale applications based on ActiveMQ Artemis queues"
go_file = "artemis_scaler"
+++

### Trigger Specification

This specification describes the `artemis-queue` trigger for ActiveMQ Artemis queues.

```yaml
triggers:
- type: artemis-queue
  metadata:
    managementEndpoint: "artemis-activemq.artemis:8161"
    queueName: "test"
    brokerName: "artemis-activemq"
    brokerAddress: "test"
    queueLength: '10'
    activationQueueLength: '1'
    username: 'ARTEMIS_USERNAME'
    password: 'ARTEMIS_PASSWORD'
    restApiTemplate: # Optional. Default : "http://<<managementEndpoint>>/console/jolokia/read/org.apache.activemq.artemis:broker=\"<<brokerName>>\",component=addresses,address=\"<<brokerAddress>>\",subcomponent=queues,routing-type=\"anycast\",queue=\"<<queueName>>\"/MessageCount"
```

**Parameter list:**

- `managementEndpoint` - ActiveMQ Artemis management endpoint to connect to in `<hostname>:<port>` format.
- `queueName` - Name of the queue to check for the number of messages available.
- `brokerName` - Name of the broker as defined in Artemis.
- `brokerAddress` - Address of the broker.
- `queueLength` - Target value for queue length passed to the scaler. Example: if one pod can handle 10 messages, set the queue length target to 10. If the actual number of messages in the queue is 30, the scaler scales to 3 pods. (default: 10)
- `activationQueueLength` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)
- `restApiTemplate` - Template to build REST API url to get queue size. (Default: `"http://<<managementEndpoint>>/console/jolokia/read/org.apache.activemq.artemis:broker=\"<<brokerName>>\",component=addresses,address=\"<<brokerAddress>>\",subcomponent=queues,routing-type=\"anycast\",queue=\"<<queueName>>\"/MessageCount"`, Optional)
- `corsHeader` - Value to populate the Origin header field for CORS filtering. (Default: `"http://<<managmentEndpoint>>"`, Optional)
- `unsafeSsl` - Skip certificate validation when connecting over HTTPS. (Default: `false`, Optional)

### Authentication Parameters

 You can use `TriggerAuthentication` CRD to configure the `username` and `password` to connect to the management endpoint.

**Username and Password based authentication:**

- `username` - The username to use to connect to the broker's management endpoint.
- `password` - The password to use to connect to the broker's management endpoint.

**TLS authentication:**

- `ca` - Certificate authority file for TLS client authentication. (Optional)
- `cert` - Certificate for client authentication. (Optional)
- `key` - Key for client authentication. (Optional)
- `keyPassword` - Password for the client certificate private key. (Optional, Required when `key` is encrypted)

### Example

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: kedartemis
  namespace: kedartemis
  labels:
    app: kedartemis
type: Opaque
data:
  artemis-password: "YXJ0ZW1pcw=="
  artemis-username: "YXJ0ZW1pcw=="
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: trigger-auth-kedartemis
  namespace: kedartemis
spec:
  secretTargetRef:
    - parameter: username
      name: kedartemis
      key: artemis-username
    - parameter: password
      name: kedartemis
      key: artemis-password
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kedartemis-consumer-scaled-object
  namespace: kedartemis
spec:
  scaleTargetRef:
    name: kedartemis-consumer
  triggers:
    - type: artemis-queue
      metadata:
        managementEndpoint: "artemis-activemq.artemis:8161"
        queueName: "test"
        queueLength: "50"
        brokerName: "artemis-activemq"
        brokerAddress: "test"
        restApiTemplate: # Optional. Default: "http://<<managementEndpoint>>/console/jolokia/read/org.apache.activemq.artemis:broker=\"<<brokerName>>\",component=addresses,address=\"<<brokerAddress>>\",subcomponent=queues,routing-type=\"anycast\",queue=\"<<queueName>>\"/MessageCount"
      authenticationRef:
        name: trigger-auth-kedartemis
```

### Example with TLS (HTTPS with self-signed certificates)

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kedartemis-consumer-scaled-object
  namespace: kedartemis
spec:
  scaleTargetRef:
    name: kedartemis-consumer
  triggers:
    - type: artemis-queue
      metadata:
        managementEndpoint: "artemis-activemq.artemis:8443"
        queueName: "test"
        queueLength: "50"
        brokerName: "artemis-activemq"
        brokerAddress: "test"
        unsafeSsl: "true"  # Skip certificate validation for self-signed certificates
      authenticationRef:
        name: trigger-auth-kedartemis
```

### Example with mutual TLS (client certificates)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: kedartemis-tls
  namespace: kedartemis
type: Opaque
data:
  artemis-ca: "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCi4uLgo="  # Base64 encoded CA certificate
  artemis-cert: "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCi4uLgo="  # Base64 encoded client certificate
  artemis-key: "LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCi4uLgo="  # Base64 encoded client private key
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: trigger-auth-kedartemis-tls
  namespace: kedartemis
spec:
  secretTargetRef:
    - parameter: ca
      name: kedartemis-tls
      key: artemis-ca
    - parameter: cert
      name: kedartemis-tls
      key: artemis-cert
    - parameter: key
      name: kedartemis-tls
      key: artemis-key
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kedartemis-consumer-scaled-object
  namespace: kedartemis
spec:
  scaleTargetRef:
    name: kedartemis-consumer
  triggers:
    - type: artemis-queue
      metadata:
        managementEndpoint: "artemis-activemq.artemis:8443"
        queueName: "test"
        queueLength: "50"
        brokerName: "artemis-activemq"
        brokerAddress: "test"
      authenticationRef:
        name: trigger-auth-kedartemis-tls
```