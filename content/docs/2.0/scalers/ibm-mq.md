+++
title = "IBM MQ"
layout = "scaler"
availability = "v2.0+"
maintainer = "Community"
description = "Scale applications based on IBM MQ Queue"
go_file = "ibmmq_scaler"
+++

### Trigger Specification

This specification describes the `ibmmq` trigger for IBM MQ Queue.

```yaml
triggers:
    - type: ibmmq
      metadata:
        host: <ibm-host> # REQUIRED - IBM MQ Queue Manager Admin REST Endpoint
        queueManager: <queue-manager> # REQUIRED - Your queue manager
        queueName: <queue-name> # REQUIRED - Your queue name
        tlsDisabled: <TLS enabled/disabled> # OPTIONAL - Set 'true' to disable TLS. Default: false
        queueDepth: <queue-depth> # OPTIONAL - Queue depth target for HPA. Default: 5 messages
      authenticationRef:
        name: ibmmq-consumer-trigger
```




### Authentication Parameters

TriggerAuthentication CRD is used to connect and authenticate to IBM MQ:
  **Parameter list**
  - `host`: REQUIRED - IBM MQ Queue Manager Admin REST Endpoint. Example URI endpoint structure on IBM cloud `https://example.mq.appdomain.cloud/ibmmq/rest/v2/admin/action/qmgr/QM/mqsc`
  - `queueManager`: REQUIRED - Name of the queue manager from which messages will be consumed
  - `queueName`: REQUIRED - Name of the Queue within the Queue Manager defined from which messages will be consumed
  - `tlsDisabled`: OPTIONAL - A boolean: Can be set to 'true' to disable TLS. False by default.
  - `queueDepth`: OPTIONAL - Queue depth Target for HPA. Will be set to Default Value of 5 if not Provided.
  
  **Authentication Parameters** 
  - `ADMIN_USER`: REQUIRED - The admin REST endpoint username for your MQ Queue Manager
  - `ADMIN_PASSWORD`: REQUIRED - The admin REST endpoint API key for your MQ Queue Manager

### Example
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-ibmmq-secret
data:
  ADMIN_USER: <encoded-username> # REQUIRED - Admin Username
  ADMIN_PASSWORD: <encoded-password> # REQUIRED - Admin Password
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: ibmmq-scaledobject
  namespace: default
  labels:
    deploymentName: ibmmq-deployment
spec:
  scaleTargetRef:
    name: ibmmq-deployment
  pollingInterval: 5 # OPTIONAL - Default: 30 seconds
  cooldownPeriod: 30 # OPTIONAL - Default: 300 seconds
  maxReplicaCount: 18 # OPTIONAL - Default: 100
  triggers:
    - type: ibmmq
      metadata:
        host: <ibm-host> # REQUIRED - IBM MQ Queue Manager Admin REST Endpoint
        queueManager: <queue-manager> # REQUIRED - Your queue manager
        queueName: <queue-name> # REQUIRED - Your queue name
        tlsDisabled: <TLS enabled/disabled> # OPTIONAL - Set 'true' to disable TLS. Default: false
        queueDepth: <queue-depth> # OPTIONAL - Queue depth target for HPA. Default: 5 messages
      authenticationRef:
        name: keda-ibmmq-trigger-auth
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-ibmmq-trigger-auth
  namespace: default
spec:
  secretTargetRef:
    - parameter: username
      name: keda-ibmmq-secret
      key: ADMIN_USER
    - parameter: password
      name: keda-ibmmq-secret
      key: ADMIN_PASSWORD
```
