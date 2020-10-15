> © Copyright IBM Corporation 2020
> 
> Licensed under the Apache License, Version 2.0 (the "License"); you
> may not use this file except in compliance with the License. You may
> obtain a copy of the License at
> 
> http://www.apache.org/licenses/LICENSE-2.0
> 
> Unless required by applicable law or agreed to in writing, software
> distributed under the License is distributed on an "AS IS" BASIS,
> WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
> implied. See the License for the specific language governing
> permissions and limitations under the License.


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
        queueLength: '5' # OPTIONAL - Queue length target for HPA. Default: 5 messages
        host: <ibm-host> # REQUIRED - IBM MQ Queue Manager Admin REST Endpoint
        queueManager: <queue-manager> # REQUIRED - Queue Manager
        queueName: <queue-name> # REQUIRED - Queue Name
        tlsDisabled: <TLS> # REQUIRED - Set 'true' to disable TLS.
      authenticationRef:
        name: ibmmq-consumer-trigger
```

**Parameter list:**

- `queueLength`: OPTIONAL - Queue Length Target for HPA. Will be set to Default Value of 5 if not Provided.
- `host`: REQUIRED - IBM MQ Queue Manager Admin REST Endpoint. Example URI endpoint structure on IBM cloud `https://example.mq.appdomain.cloud/ibmmq/rest/v2/admin/action/qmgr/QM/mqsc`
- `queueName`: REQUIRED - Name of the Queue within the Queue Manager defined from which messages will be consumed

### Authentication Parameters

TriggerAuthentication CRD is used to connect and authenticate to IBM MQ:

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
        queueLength: '5' # OPTIONAL - Depth of Queue per Replica Pod 
        host: <ibm-host> # REQUIRED - IBM MQ Queue Manager Admin REST Endpoint
        queueName: <queue-name> # REQUIRED - Queue Name
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
