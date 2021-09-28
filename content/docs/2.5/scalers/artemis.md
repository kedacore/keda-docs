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
    restApiTemplate: # Optional. Default : "http://<<managementEndpoint>>/console/jolokia/read/org.apache.activemq.artemis:broker=\"<<brokerName>>\",component=addresses,address=\"<<brokerAddress>>\",subcomponent=queues,routing-type=\"anycast\",queue=\"<<queueName>>\"/MessageCount"
```

**Parameter list:**

- `managementEndpoint` - ActiveMQ Artemis management endpoint to connect to in `<hostname>:<port>` format.
- `queueName` - Name of the queue to check for the number of messages available.
- `brokerName` - Name of the broker as defined in Artemis.
- `brokerAddress` - Address of the broker.
- `queueLength` - Target value for queue length passed to the scaler. Example: if one pod can handle 10 messages, set the queue length target to 10. If the actual number of messages in the queue is 30, the scaler scales to 3 pods. (default: 10)
- `restApiTemplate` - Template to build REST API url to get queue size.
  - Default - `"http://<<managementEndpoint>>/console/jolokia/read/org.apache.activemq.artemis:broker=\"<<brokerName>>\",component=addresses,address=\"<<brokerAddress>>\",subcomponent=queues,routing-type=\"anycast\",queue=\"<<queueName>>\"/MessageCount"`. In this example, `<<managementEndpoint>>`, `<<brokerName>>`, `<<brokerAddress>>` and `<<queueName>>` will be replaced automatically during runtime by values from metadata of YAML definition: `managementEndpoint`, `brokerName`, `brokerAddress`, `queueName`.
  
### Authentication Parameters

 You can use `TriggerAuthentication` CRD to configure the `username` and `password` to connect to the management endpoint.

**Username and Password based authentication:**

- `username` - Required. The username to use to connect to the broker's management endpoint.
- `password` - Required. The password to use to connect to the broker's management endpoint.

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