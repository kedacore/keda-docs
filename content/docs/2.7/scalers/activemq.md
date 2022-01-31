+++
title = "ActiveMQ"
availability = "v2.6+"
maintainer = "Community"
description = "Scale applications based on ActiveMQ Queue."
layout = "scaler"
go_file = "activemq_scaler"
+++

### Trigger Specification

This specification describes the `activemq` trigger that scales based on a ActiveMQ Queue.

```yaml
triggers:
- type: activemq
  metadata:
    managementEndpoint: "activemq.activemq-test:8161"
    destinationName: "testQueue"
    brokerName: "activemq_broker"
    targetQueueSize: "100"
```

**Parameter list:**

- `managementEndpoint` - ActiveMQ management endpoint in format: `<hostname>:<port>`.
- `destinationName` - Name of the queue to check for the message count.
- `brokerName` - Name of the broker as defined in ActiveMQ.
- `targetQueueSize` - Target value for queue length passed to the scaler. The scaler will cause the replicas to increase if the queue message count is greater than the target value per active replica. (Default: `10`, Optional)
- `restAPITemplate` - Template to build REST API url to get queue size. (Default: `"http://{{.ManagementEndpoint}}/api/jolokia/read/org.apache.activemq:type=Broker,brokerName={{.BrokerName}},destinationType=Queue,destinationName={{.DestinationName}}/QueueSize"`, Optional) 

**Parameter Requirements:**

- In case of `restAPITemplate` parameter is not used, parameters resolving the REST API Template are all **required**: `managementEndpoint`, `destinationName`, `brokerName`.
- ActiveMQ Scaler polls the ActiveMQ REST API to monitor message count of target queue. Currently, the scaler supports basic authentication. `username` and `password` are **required**. See [Authentication Parameters](#authentication-parameters) below. 

### Authentication Parameters

You can authenticate by using username and password via `TriggerAuthentication` configuration.

**Username and Password based Authentication:**

- `username` - Username for connect to the management endpoint of ActiveMQ.
- `password` - Password for connect to the management endpoint of ActiveMQ.

### Example

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: activemq-secret
type: Opaque
data:
  activemq-password: ACTIVEMQ_PASSWORD
  activemq-username: ACTIVEMQ_USERNAME
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: trigger-auth-activemq
spec:
  secretTargetRef:
  - parameter: username
    name: activemq-secret
    key: activemq-username
  - parameter: password
    name: activemq-secret
    key: activemq-password
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: activemq-scaledobject
spec:
  scaleTargetRef:
    name: nginx-deployment
  triggers:
  - type: activemq
    metadata:
      managementEndpoint: "activemq.activemq-test:8161"
      destinationName: "testQ"
      brokerName: "localhost"
      targetQueueSize: "50"
    authenticationRef:
      name: trigger-auth-activemq
```
