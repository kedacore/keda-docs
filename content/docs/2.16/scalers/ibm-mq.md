+++
title = "IBM MQ"
availability = "v2.0+"
maintainer = "Community"
category = "Messaging"
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
    queueName: <queue-name> # REQUIRED - Your queue name
    tlsDisabled: <TLS enabled/disabled> # DEPRECATED: This parameter is deprecated as of KEDA v2.16 in favor of unsafeSsl and will be removed in version v2.18
    queueDepth: <queue-depth> # OPTIONAL - Queue depth target for HPA. Default: 20 messages
    activationQueueDepth: <activation-queue-depth> # OPTIONAL - Activation queue depth target. Default: 0 messages
    usernameFromEnv: <admin-user> # OPTIONAL - Provide admin username from env instead of as a secret
    passwordFromEnv: <admin-password> # OPTIONAL - Provide admin password from env instead of as a secret
    unsafeSsl: "false" # OPTIONAL - Used for skipping certificate check when having self-signed certs 'true'. Default: false
```

**Parameter list:**

- `host` - IBM MQ Queue Manager Admin REST Endpoint. Example URI endpoint structure on IBM cloud `https://example.mq.appdomain.cloud/ibmmq/rest/v2/admin/action/qmgr/QM/mqsc`.
- `queueName` - Name of the Queue defined from which messages will be consumed.
- `tlsDisabled` - Can be set to 'true' to disable TLS. (DEPRECATED: This parameter is deprecated as of KEDA v2.16 in favor of unsafeSsl and will be removed in version v2.18, Values: `true`, `false` , Default: `false`, Optional)
- `queueDepth` - Queue depth Target for HPA. (Default: `20`, Optional)
- `activationQueueDepth` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)
- `usernameFromEnv` - Provide admin username from env instead of as a secret. (Optional)
- `passwordFromEnv` - Provide admin password from env instead of as a secret. (Optional)
- `unsafeSsl` - Whether to allow unsafe SSL (Values: `true`, `false`, Default: `false`, Optional)

### Authentication Parameters

TriggerAuthentication CRD is used to connect and authenticate to IBM MQ:

**Authentication Parameters**

- `ADMIN_USER` - REQUIRED - The admin REST endpoint username for your MQ Queue Manager`.
- `ADMIN_PASSWORD` - REQUIRED - The admin REST endpoint API key for your MQ Queue Manager.
- `ca` - Certificate authority file for TLS client authentication. (Optional)
- `cert` - Certificate for client authentication. (Optional)
- `key` - Key for client authentication. (Optional)
- `keyPassword` - If set the keyPassword is used to decrypt the provided key. (Optional)
- `usernameFromEnv` - Provide admin username from env instead of as a secret. (Optional)
- `passwordFromEnv` - Provide admin password from env instead of as a secret. (Optional)

### Example

Example with Basic Auth

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
        queueName: <queue-name> # REQUIRED - Your queue name
        queueDepth: <queue-depth> # OPTIONAL - Queue depth target for HPA. Default: 20 messages
        usernameFromEnv: <admin-user> # OPTIONAL - Provide admin username from env instead of as a secret
        passwordFromEnv: <admin-password> # OPTIONAL - Provide admin password from env instead of as a secret
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

Example with Basic Auth and TLS

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-ibmmq-secret
data:
  ADMIN_USER: <encoded-username> # REQUIRED - Admin Username
  ADMIN_PASSWORD: <encoded-password> # REQUIRED - Admin Password
  cert: <your tls.crt>
  key: <your tls.key>
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
        queueName: <queue-name> # REQUIRED - Your queue name
        queueDepth: <queue-depth> # OPTIONAL - Queue depth target for HPA. Default: 20 messages
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
    - parameter: cert
      name: keda-ibmmq-secret
      key: cert
    - parameter: key
      name: keda-ibmmq-secret
      key: key
```
