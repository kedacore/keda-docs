+++
title = "Solace PubSub+ Event Broker"
availability = "2.4+"
maintainer = "Community"
description = "Scale applications based on Solace PubSub+ Event Broker Queues"
go_file = "solace_scaler"
+++

### Trigger Specification

This specification describes the `solace-event-queue` trigger that scales based on a Solace PubSub+ Event Broker queue.

```yaml
triggers:
- type: solace-event-queue
  metadata:
    solaceSempBaseURL:                  http://solace_broker:8080
    messageVpn:                         message-vpn
    queueName:                          queue_name
    messageCountTarget:                 '100'
    messageSpoolUsageTarget:            '100'       ### Megabytes (MB)
    activationMessageCountTarget:       '100'
    activationMessageSpoolUsageTarget:  '100'       ### Megabytes (MB)
    username:                           semp-user
    password:                           semp-pwd
    usernameFromEnv:                    ENV_VAR_USER
    passwordFromEnv:                    ENV_VAR_PWD
```

**Parameter list:**

- `solaceSempBaseURL` - Solace SEMP Endpoint in format: `<protocol>://<host-or-service>:<port>`.
- `messageVpn` - Message VPN hosted on the Solace broker.
- `queueName` - Message Queue to be monitored.
- `messageCountTarget` - The target number of messages manageable by a pod. The scaler will cause the replicas to increase if the queue message backlog is greater than the target value per active replica.
- `activationMessageCountTarget` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional)
- `messageSpoolUsageTarget` - Integer value expressed in Megabytes (MB). The target spool usage manageable by a pod. The scaler will cause the replicas to increase if the queue spool usage is greater than the target value per active replica.
- `activationMessageSpoolUsageTarget` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional)
- `username` - User account with access to Solace SEMP RESTful endpoint.
- `password` - Password for the user account.
- `usernameFromEnv` - Environment variable set with SEMP user account.
- `passwordFromEnv` - Environment variable set with password for the user account.

**Parameter Requirements:**

- Parameters resolving the target queue are all **required:** `solaceSempBaseURL`, `messageVpn`, `queueName`
- **At least** one of `messageCountTarget` or `messageSpoolUsageTarget` is **required.** If both values are present, the metric value resulting in the higher desired replicas will be used. (Standard KEDA/HPA behavior)
- The Solace PubSub+ Scaler polls the Solace SEMP REST API to monitor target queues. Currently, the scaler supports basic authentication. `username` and `password` are **required** for the `solace-event-queue` trigger to function. These values may be set directly in the trigger metadata or using a TriggerAuthentication record. See [Authentication Parameters](#authentication-parameters) below. Alternatively, credentials may be passed from environment variables identified by `usernameFromEnv` and `passwordFromEnv`.

### Authentication Parameters

You can use TriggerAuthentication CRD to configure the username and password to connect to the management endpoint.

**Username and Password based authentication:**
- `username` - Required. The username to use to connect to the Solace PubSub+ Event Broker's SEMP endpoint.
- `password` - Required. The password to use to connect to the Solace PubSub+ Event Broker's SEMP endpoint.

### Example

The objects in the example below are declared in `namespace=solace`. It is not required to do so. If you do define a namespace for the configuration objects, then they should all be delcared in the same namespace.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name:      solace-secret
  namespace: solace
  labels:
    app: solace-consumer
type: Opaque
data:
  SEMP_USER:         YWRtaW4=
  SEMP_PASSWORD:     S2VkYUxhYkFkbWluUHdkMQ==
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name:      solace-scaled-object
  namespace: solace
spec:
  scaleTargetRef:
    apiVersion:    apps/v1
    kind:          Deployment
    name:          solace-consumer
  pollingInterval: 20
  cooldownPeriod:  60
  minReplicaCount:  0
  maxReplicaCount: 10
  triggers:
  - type: solace-event-queue
    metadata:
      solaceSempBaseURL:       http://broker-pubsubplus.solace.svc.cluster.local:8080
      messageVpn:              test_vpn
      queueName:               SCALED_CONSUMER_QUEUE1
      messageCountTarget:      '50'
      messageSpoolUsageTarget: '100000'
    authenticationRef:
      name: solace-trigger-auth
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: solace-trigger-auth
  namespace: solace
spec:
  secretTargetRef:
    - parameter:   username
      name:        solace-secret
      key:         SEMP_USER
    - parameter:   password
      name:        solace-secret
      key:         SEMP_PASSWORD
```
