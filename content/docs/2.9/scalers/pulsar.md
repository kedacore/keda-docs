+++
title = "Apache Pulsar"
availability = "v2.8"
maintainer = "Community"
description = "Scale applications based on an Apache Pulsar topic subscription."
layout = "scaler"
+++

### Trigger Specification

This specification describes the `pulsar` trigger for an Apache Pulsar topic.

```yaml
triggers:
- type: pulsar
  metadata:
    adminURL: http://localhost:80
    topic: persistent://public/default/my-topic
    subscription: sub1
    msgBacklogThreshold: '5'
    activationMsgBacklogThreshold: '2'
    authModes: ""
```

**Parameter list:**

- `adminURL` - Stats URL of the admin API for your topic.
- `topic` - Pulsar topic. format of `persistent://{tenant}/{namespace}/{topicName}`
- `subscription` - Name of the topic subscription
- `msgBacklogThreshold` - Average target value to trigger scaling actions. (default: 10)
- `activationMsgBacklogThreshold` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional)
- `authModes` - a comma separated list of authentication modes to use. (Values: `bearer`, `tls`,`basic`, Default: `""`, Optional, `tls,bearer` or `tls,basic` are valid combinations and would indicate mutual TLS to secure the connection and then `bearer` or `basic` headers should be added to the HTTP request)

### Authentication Parameters

The authentication is defined in `authModes`. The associated configuration parameters are specified in the `TriggerAuthentication` spec.  

**Bearer Auth**

When configuring Bearer Authentication (Token Auth), configure the following:

- `bearerToken`: This token will be sent as a header in the form `Authorization: Bearer <token>`. 

**Basic Auth**
When configuring Basic Authentication, configure the following:

- `username`: the username
- `password`: the password (optional)

**TLS:**

When configuring mutual TLS authentication, configure the following:

- `ca`: The trusted root Certificate authority used to validate the server's certificate.
- `cert`: Certificate for client authentication.
- `key`: Key for client authentication. 


### TLS with custom CA Certificates

When configuring a trusted root CA that is not well known, it is sufficient to specify the `ca` field on the `TriggerAuthentication` resource. See [Bearer Token with TLS via custom trusted CA Certificate](#bearer-token-with-tls-via-custom-trusted-ca-certificate) for an example.

Before 2.9.0, it was necessary to configure `tls: enable` on the `ScaledObject`. That was removed in a backwards compatible way, so you can remove that field now.

### Examples

#### No Authentication and No TLS

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: pulsar-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: pulsar-consumer
  pollingInterval: 30
  triggers:
  - type: pulsar
    metadata:
      adminURL: http://localhost:80
      topic: persistent://public/default/my-topic
      subscription: sub1
      msgBacklogThreshold: '5'
```

#### Only Mutual TLS Authentication

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-pulsar-secrets
  namespace: default
data:
  ca: <your ca>
  cert: <your cert>
  key: <your key>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-pulsar-credential
  namespace: default
spec:
  secretTargetRef:
  - parameter: ca
    name: keda-pulsar-secrets
    key: ca
  - parameter: cert
    name: keda-pulsar-secrets
    key: cert
  - parameter: key
    name: keda-pulsar-secrets
    key: key
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: pulsar-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: pulsar-consumer
  pollingInterval: 30
  triggers:
  - type: pulsar
    metadata:
      authModes: "tls"
      adminURL: https://localhost:8443
      topic: persistent://public/default/my-topic
      subscription: sub1
      msgBacklogThreshold: '5'
    authenticationRef:
      name:  keda-trigger-auth-pulsar-credential
```

#### Bearer Token with TLS via custom trusted CA Certificate

In order to enable Pulsar's Token Authentication feature, you can use the following example. Note that this example
also utilizes a custom CA Certificate for TLS support. Because TLS Authentication is not used in this example, the
`authModes` field only has `bearer`.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-pulsar-secrets
  namespace: default
data:
  ca: <your self signed root CA>
  token: <your token>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-pulsar-credential
  namespace: default
spec:
  secretTargetRef:
  - parameter: ca
    name: keda-pulsar-secrets
    key: ca
  - parameter: bearerToken
    name: keda-pulsar-secrets
    key: token
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: pulsar-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: pulsar-consumer
  pollingInterval: 30
  triggers:
  - type: pulsar
    metadata:
      authModes: "bearer"
      adminURL: https://localhost:8443
      topic: persistent://public/default/my-topic
      subscription: sub1
      msgBacklogThreshold: '5'
    authenticationRef:
      name:  keda-trigger-auth-pulsar-credential
```

#### Basic Auth with TLS Relying on Well Known Root CA

In order to enable Pulsar's Token Authentication feature, you can use the following example. Note that this example
also utilizes a custom CA Certificate for TLS support. Because TLS Authentication is not used in this example, the
`authModes` field only has `bearer`.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-pulsar-secrets
  namespace: default
data:
  username: <your username>
  password: <your password>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-pulsar-credential
  namespace: default
spec:
  secretTargetRef:
  - parameter: username
    name: keda-pulsar-secrets
    key: admin
  - parameter: password
    name: keda-pulsar-secrets
    key: password
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: pulsar-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: pulsar-consumer
  pollingInterval: 30
  triggers:
  - type: pulsar
    metadata:
      authModes: "bearer"
      adminURL: https://pulsar.com:8443
      topic: persistent://public/default/my-topic
      subscription: sub1
      msgBacklogThreshold: '5'
    authenticationRef:
      name:  keda-trigger-auth-pulsar-credential
```
