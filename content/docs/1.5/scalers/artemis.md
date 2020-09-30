+++
title = "ActiveMQ Artemis"
layout = "scaler"
availability = "v1.5+"
maintainer = "Community"
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
    username: 'ARTEMIS_USERNAME'
    password: 'ARTEMIS_PASSWORD'
```

**Parameter list:**

- `managementEndpoint`: "hostname:port" to connect to ActiveMQ Artemis management endpoint.
- `queueName`: the name of the queue to check for the number of messages available.
- `brokerName`: the name of the broker as defined in Artemis.
- `brokerAddress`: the address name of the broker.
- `queueLength` How much messages are in the queue. Default is 10. Optional.
  
### Authentication Parameters

 You can use `TriggerAuthentication` CRD to configure the `username` and `password` to connect to the management endpoint.

**Username and Password based authentication:**

- `username` Required. The username to use to connect to the broker's management endpoint.
- `password` Required. The password to use to connect to the broker's management endpoint.

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
apiVersion: keda.k8s.io/v1alpha1
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
apiVersion: keda.k8s.io/v1alpha1
kind: ScaledObject
metadata:
  name: kedartemis-consumer-scaled-object
  namespace: kedartemis
  labels:
    deploymentName: kedartemis-consumer
spec:
  scaleTargetRef:
    deploymentName: kedartemis-consumer
  triggers:
    - type: artemis-queue
      metadata:
        managementEndpoint: "artemis-activemq.artemis:8161"
        queueName: "test"
        queueLength: "50"
        brokerName: "artemis-activemq"
        brokerAddress: "test"
      authenticationRef:
        name: trigger-auth-kedartemis
```