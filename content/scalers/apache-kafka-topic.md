+++
fragment = "content"
weight = 100
title = "Apache Kafka Topic"
background = "light"
+++

Scale applications based on Apache Kafka Topic or other services that support Kafka protocol.

**Availability:** v1.0+ | **Maintainer:** Microsoft

<!--more-->

### Trigger Specification

This specification describes the `kafka` trigger for Apache Kafka Topic.

```yaml
  triggers:
  - type: kafka
    metadata:
      # brokerList: kafka.svc:9092 - deprecated
      bootstrapServers: kafka.svc:9092
      consumerGroup: my-group
      topic: test-topic
      lagThreshold: '5'
```

**Parameter list:**

- `lagThreshold` Optional. How much the stream is lagging on the current consumer group. Default is 10.

### Authentication Parameters

 You can use `TriggerAuthentication` CRD to configure the authenticate by providing authMode, username, password. If your kafka cluster does not have sasl authentication turned on, you will not need to pay attention to it.

**Credential based authentication:**

- `authMode` Kafka sasl auth mode. Optional. The default value is none. For now, it must be one of none, sasl_plaintext, sasl_ssl, sasl_ssl_plain, sasl_scram_sha256, sasl_scram_sha512.
- `username` Optional. If authmode is not none, this is required.
- `password` Optional.If authmode is not none, this is required.
- `ca` Certificate authority file for TLS client authentication. Optional. If authmode is sasl_ssl, this is required.
- `cert` Certificate for client authentication. Optional. If authmode is sasl_ssl, this is required.
- `key` Key for client authentication. Optional. If authmode is sasl_ssl, this is required.


### Example

Your kafka cluster no sasl auth:

```yaml
apiVersion: keda.k8s.io/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-scaledobject
  namespace: default
  labels:
    deploymentName: azure-functions-deployment
spec:
  scaleTargetRef:
    deploymentName: azure-functions-deployment
  pollingInterval: 30
  triggers:
  - type: kafka
    metadata:
      # Required
      # brokerList: kafka.svc:9092 - deprecated
      bootstrapServers: localhost:9092
      consumerGroup: my-group       # Make sure that this consumer group name is the same one as the one that is consuming topics
      topic: test-topic
      # Optional
      lagThreshold: "50"
```

Your kafka cluster turn on sasl auth

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-kafka-secrets
  namespace: default
data:
  authMode: "sasl_plaintext"
  username: "admin"
  password: "admin"
  ca: <your ca>
  cert: <your cert>
  key: <your key>
---
apiVersion: keda.k8s.io/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-kafka-credential
  namespace: default
spec:
  secretTargetRef:
  - parameter: authMode
    name: keda-kafka-secrets
    key: authMode
  - parameter: username
    name: keda-kafka-secrets
    key: username
  - parameter: password
    name: keda-kafka-secrets
    key: password
  - parameter: ca
    name: keda-kafka-secrets
    key: ca
  - parameter: cert
    name: keda-kafka-secrets
    key: cert
  - parameter: key
    name: keda-kafka-secrets
    key: key
---
apiVersion: keda.k8s.io/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-scaledobject
  namespace: default
  labels:
    deploymentName: azure-functions-deployment
spec:
  scaleTargetRef:
    deploymentName: azure-functions-deployment
  pollingInterval: 30
  triggers:
  - type: kafka
    metadata:
      # Required
      # brokerList: kafka.svc:9092 - deprecated
      bootstrapServers: localhost:9092
      consumerGroup: my-group       # Make sure that this consumer group name is the same one as the one that is consuming topics
      topic: test-topic
      # Optional
      lagThreshold: "50"
    authenticationRef:
      name: keda-trigger-auth-kafka-credential
```
