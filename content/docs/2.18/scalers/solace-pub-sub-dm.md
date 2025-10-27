+++
title = "Solace PubSub+ Event Broker - Direct Messaging"
availability = "2.18+"
maintainer = "Community"
category = "Messaging"
description = "Scale applications based on Solace PubSub+ Event Broker - Direct Messaging"
go_file = "solace_dm_scaler"
+++

### Trigger Specification

This specification describes the `solace-direct-messaging` trigger that scales based on a Solace PubSub+ Event Broker direct messaging rates for all the clients in a message vpn that matches a common client name prefix.

> &#128161; **Note:**
This trigger is for **Direct messaging** only, it provides the ability to scale the number of client instances automatically based upon transient metrics for shared subscriptions (transmitted message rate, transmitted bytes rate, D-1 queue length), all this metrics exists as long as the clients are connected.

If you need to use **Guaranteed messaging** (Solace PubSub+ Event Broker queue) you should use the `solace-event-queue` trigger.

```yaml
  triggers:
  - type: solace-direct-messaging
    metricType: Value
    metadata:
      solaceSempBaseURL:  "https://solace_broker1:943,https://solace_broker2:943"
      messageVpn: "message-vpn"
      clientNamePattern: "client-name-pattern"
      unsafeSSL: "true"
      queuedMessagesFactor: '3'
      aggregatedClientTxMsgRateTarget: '600'      
      aggregatedClientTxByteRateTarget: '0'
      aggregatedClientAverageTxByteRateTarget: '0'
      aggregatedClientAverageTxMsgRateTarget: '0'
      usernameFromEnv: 'ENV_VAR_USER'
      passwordFromEnv: 'ENV_VAR_PWD'
    authenticationRef:
      name: trigger-authentication-ref
```

**Parameter list:**

- `solaceSempBaseURL` - Comma separated list of Solace SEMP Endpoint in format: `<protocol>://<host-or-service>:<port>`. (Required)

- `messageVpn` - Message VPN hosted on the Solace broker from which the metrics will be collected. (Required)

- `clientNamePattern` - Client name pattern that will be used to identify the clients that are consuming from a shared subscription. (Required). It will be used to match all the client names that match the expression: **' \*client-name-pattern\* '**

- `unsafeSSL` - Flag to enable unsafe host urls (self signed certificates). (Default:  `false`, Optional)

- `queuedMessagesFactor` - Flag to to increase weight on queued messages (D-1) and scale faster to avoid discarding messages. (Default:  `3`, Optional)

- `aggregatedClientTxMsgRateTarget` - Target number messages per second the clients in the shared subscription are expected to consume, if the actual aggregated messages per second number is greater the number of replicas will be increased. (Default: `0`, Optional)

- `aggregatedClientTxByteRateTarget` - Target number bytes per second the clients in the shared subscription are expected to consume, if the actual aggregated bytes per second number is greater the number of replicas will be increased. (Default: `0`, Optional)

- `aggregatedClientAverageTxByteRateTarget` - Target average number messages per minute the clients in the shared subscription are expected to consume, if the actual aggregated messages per minute number is greater the number of replicas will be increased. (Default: `0`, Optional)

- `aggregatedClientAverageTxMsgRateTarget` - Target average number bytes per minute the clients in the shared subscription are expected to consume, if the actual aggregated bytes per minute number is greater the number of replicas will be increased. (Default: `0`, Optional)

- `usernameFromEnv` - Environment variable set with SEMP user account. (Optional)

- `passwordFromEnv` - Environment variable set with password for the user account. (Optional)

**Parameter Requirements:**

- Parameters resolving the target host and shared subscription are all **required:** `solaceSempBaseURL`, `messageVpn`, `clientNamePattern`

- **At least** one of `aggregatedClientTxMsgRateTarget`, `aggregatedClientTxByteRateTarget`, `aggregatedClientAverageTxByteRateTarget` or  `aggregatedClientAverageTxMsgRateTarget` is **required**.

If more than one target values are present, calculation is done for each metric and the metric value resulting in the highest desired replicas will be used. (Standard KEDA/HPA behavior)

For more details please see [Horizontal Pod Autoscaling - Algorithm details](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#algorithm-details)

The `solace-direct-messaging` Scaler polls the Solace SEMP REST API to get transient metrics from connected clients. Currently, the scaler supports basic authentication. `username` and `password` are **required** for the  trigger to function. 

These values can be set in several different ways:
  - Use TriggerAuthentication record. See [Authentication Parameters](#authentication-parameters) below.
  - Alternatively, credentials may be passed from environment variables identified by `usernameFromEnv` and `passwordFromEnv` metadata fields. The values of these fields are the names of environment variables that must be available to the scaler at run-time.

### Authentication Parameters
You can use `TriggerAuthentication` CRD to configure the authenticate by providing a set of IAM credentials.

**Username and Password based authentication:**
- `username` - Required. The username to use to connect to the Solace PubSub+ Event Broker's SEMP endpoint.
- `password` - Required. The password to use to connect to the Solace PubSub+ Event Broker's SEMP endpoint.

### Example
The objects in the example below are declared in `namespace=solace`. It is not required to 
do so. If you do define a namespace for the configuration objects, then they should all be declared 
in the same namespace.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name:      solace-secret
  namespace: solace
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
  pollingInterval:  3
  cooldownPeriod:  60
  #Always > 0 because is direct messaging!
  minReplicaCount:  1
  maxReplicaCount: 20
  advanced:
    restoreToOriginalReplicaCount: true
    horizontalPodAutoscalerConfig:
      behavior:
        scaleDown:
         #The stabilization window is used to restrict the flapping of replica count when the metrics used for scaling keep fluctuating.
         #The autoscaling algorithm uses this window to infer a previous desired state and avoid unwanted changes to workload scale.
         #All desired states from the past 1 minutes (60secs) will be considered
          stabilizationWindowSeconds: 60
          #Policy (Pods) allows at most 1 replicas to be scaled down in 10 seconds.
          policies:
          - type:          Pods
            value:         1
            #Indicates the length of time in the past for which the policy must hold true
            periodSeconds: 10
        scaleUp:
          stabilizationWindowSeconds: 0
          #Policy (Pods) allows at most 3 replicas to be scaled up in 3 seconds.
          policies:
          - type:          Pods
            value:         5
            periodSeconds: 3
          selectPolicy:    Max
  triggers:
  - type: solace-direct-messaging
    #we don’t want to take the average of the given metric across all replicas, just the value
    metricType: Value
    metadata:
      solaceSempBaseURL:  "https://broker1.messaging.solace.cloud:943,https://broker2.messaging.solace.cloud:943"
      messageVpn: "consumer_vpn"
      #all the clients that match this client name pattern will be considered for metric gathering
      clientNamePattern: "direct-messaging-simple"
      #to be able to use self signed certs
      unsafeSSL: "false"
      #to increase weight on queued messages and scale faster
      #if there are messages queued means we are behind
      queuedMessagesFactor: '3'
      #Metrics
      aggregatedClientTxMsgRateTarget: '600'      
      aggregatedClientTxByteRateTarget: '0'
      aggregatedClientAverageTxByteRateTarget: '0'
      aggregatedClientAverageTxMsgRateTarget: '0'
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
