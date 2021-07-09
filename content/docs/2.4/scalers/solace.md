+++
title = "Solace PubSub"
availability = "2.3+"
maintainer = "Community"
description = "Scale applications based on Solace PubSub+ Broker Queues"
layout = "scaler"
go_file = "solace_scaler"
+++

### Trigger Specification
This specification describes the `solace-queue` trigger that scales based on a Solace PubSub queues.

```yaml
triggers:
- type: solace-queue
  metadata:
    brokerBaseUrl:        http://solace_broker_semp:8080
    msgVpn:               message-vpn
    queueName:            queue_name
    msgCountTarget:       '100'
    msgSpoolUsageTarget:  '10000'
    username:             semp-user
    password:             semp-pwd
    usernameEnv:          ENV_VAR_USER
    passwordEnv:          ENV_VAR_PWD
```

**Parameter list:**
- `brokerBaseUrl` - Solace SEMP Endpoint in format: `<protocol>://<host-or-service>:<port>`
- `msgVpn` - Message VPN hosted on the Solace broker
- `queueName` - Message Queue to be monitored
- `msgCountTarget` - The target number of messages manageable by a pod. The scaler will cause the replicas to increase if the queue backlog is greater than that value per active replica.
- `msgSpoolUsageTarget` - The target spool usage manageable by a pod. The scaler will cause the 
- `username` - Clear text user account with access to Solace SEMP RESTful endpoint
- `password` - Clear text password for the user account
- `usernameEnv` - Environment variable set with SEMP user account
- `passwordEnv` - Environment variable set with password for the user account

**Parameter Requirements:**
- Parameters resolving the target queue are all **required:** `brokerBaseUrl`, `msgVpn`, `queueName`
- **At least** one of `msgCountTarget` or `msgSpoolUsageTarget` is **required.** If both values are present, the metric value resulting in the higher desired replicas will be used. (Standard KEDA/HPA behavior)
- `username` and `password` are **required** for the `solace-queue` trigger to function. However, these values may be passed using different methods. See [Authentication Parameters](#authentication-parameters) below.

### Authentication Parameters
The Solace PubSub Scaler polls the SEMP REST API to monitor target queues. Currently, the scaler only supports basic authentication. Username and Password credentials are both required. Credentials may be passed using one of three different methods:
- Using a `TriggerAuthentication` CRD to configure the `username` and `password`. The `TriggerAuthentication` must reference a `Secret` with the credentials defined.
- Environment Variables - Set fields `usernameEnv` and `passwordEnv` in the trigger configuration to the appropriate environment variables
- Clear Text - Set fields `username` and `password` in the trigger configuration in clear text

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
  SEMP_PASSWORD:     WW91TWF5QWxyZWFkeUJlQVdpbm5lciE=
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
  - type: solace-queue
    metadata:
      brokerBaseUrl:       http://broker-pubsubplus.solace.svc.cluster.local:8080
      msgVpn:              test_vpn
      queueName:           SCALED_CONSUMER_QUEUE1
      msgCountTarget:      '50'
      msgSpoolUsageTarget: '100000'
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
