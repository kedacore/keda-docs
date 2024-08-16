+++
title = "Solace PubSub+ Event Broker"
availability = "2.4+"
maintainer = "Community"
category = "Messaging"
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
    messageReceiveRateTarget:           '50'        ### Messages/second over last 1 minute interval
    activationMessageCountTarget:       '10'
    activationMessageSpoolUsageTarget:  '5'         ### Megabytes (MB)
    activationMessageReceiveRateTarget: '1'         ### Messages/second over last 1 minute interval
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
- `activationMessageCountTarget` - Target message count oberved on a queue for activating the scaler (scaling from 0->1 or 1->0 replicas). Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)
- `messageSpoolUsageTarget` - Integer value expressed in Megabytes (MB). The target spool usage manageable by a pod. The scaler will cause the replicas to increase if the queue spool usage is greater than the target value per active replica.
- `activationMessageSpoolUsageTarget` - Target message spool backlog (data stored in a queue expressed in Megabytes) for activating the scaler (scaling from 0->1 or 1->0 replicas). Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)
- `messageReceiveRateTarget` - Target number of messages/second managable by a replica.
- `activationMessageReceiveRateTarget` - Target number of messages per second delivered to a queue for activating the scaler (scaling from 0->1 or 1->0 replicas). Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)
- `username` - User account with access to Solace SEMP RESTful endpoint.
- `password` - Password for the user account.
- `usernameFromEnv` - Environment variable set with SEMP user account.
- `passwordFromEnv` - Environment variable set with password for the user account.

**Parameter Requirements:**

- Parameters resolving the target queue are all **required:** `solaceSempBaseURL`, `messageVpn`, `queueName`
- **At least** one of `messageCountTarget`, `messageSpoolUsageTarget`, or `messageReceiveRateTarget` is **required.** If one or more values are present, the metric value resulting in the highest desired replicas will be used. (Standard KEDA/HPA behavior)
- The Solace PubSub+ Scaler polls the Solace SEMP REST API to monitor target queues. Currently, the scaler supports basic authentication. `username` and `password` are **required** for the `solace-event-queue` trigger to function. These values can be set in several different ways:
    - `username` and `password` may be set directly in the trigger metadata
    - Use TriggerAuthentication record. See [Authentication Parameters](#authentication-parameters) below.
    - Alternatively, credentials may be passed from environment variables identified by `usernameFromEnv` and `passwordFromEnv` metadata fields. The values of these fields are the names of environment variables that must be available to the scaler at run-time.

**Important Notes about Metric Configuration:**

> &#128161; **Note:** `messageCountTarget` provides good reactivity to changes in demand based on the queue undelivered backlog. The monitored queue value from SEMPv2 is `collections.msgs.count`

> &#128161; **Note:** `messageReceiveRateTarget` provides the ability to achieve consumer stability under constant load. The value monitored from SEMPv2 is `data.averageRxMsgRate`, which is the average message delivery rate to a queue over a one minute period.

> &#128161; **Important:** For best results, both `messageCountTarget` and `messageReceiveRateTarget` should be specified to configure a Solace Scaler. A combined approach capitalizes on the best characteristics of each metric.

> &#128161; **Note:** Configured by itself, `messageCountTarget` will make consumer scaling reactive but may introduce [flapping](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#flapping): the constant creation and destruction of replicas as the system tries to achieve a steady state.
>> For example, a Solace consumer app scaled by KEDA experiences an increase in the rate of message delivery to its source queue, resulting in a backlog (high message count). Based on the `messageCountTarget`, KEDA increases the number of replicas and the backlog is cleared. With the backlog reduced, KEDA scales-in the application, reducing the number of replicas. If the rate of message delivery remains high, the application may not be able to maintain the backlog with the lower number of replicas, causing KEDA to scale-out the workload again. The backlog is again cleared - and the pattern repeats. Using the `messageReceiveRateTarget` as an additional metric can be used to identify a suitable replica count to handle the inbound message rate while keeping the backlog clear and the application performant.

> &#128161; **Note:** Configured by itself, `messageReceiveRateTarget` cannot scale consumers based on queue backlog.

> &#128161; **Activation Values:** `activationMessageCountTarget`, `activationMessageSpoolUsageTarget`, and `activationMessageReceiveRateTarget` are assumed to be `0` (zero) if not specified.

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
      ## Connection Details
      solaceSempBaseURL:        http://broker-pubsubplus.solace.svc.cluster.local:8080
      messageVpn:               test_vpn
      queueName:                SCALED_CONSUMER_QUEUE1
      ## Scaler Details, average values per replica
      messageCountTarget:       '50'
      messageSpoolUsageTarget:  '100000'
      messageReceiveRateTarget: '20'
      ## Activation - Scale from 0 replicas to active workload if one of the conditions is met
      activationMessageCountTarget:        '5'
      activationMessageSpoolUsageTarget:   '2'
      activationMessageReceiveRateTarget:  '5'
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
