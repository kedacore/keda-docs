+++
title = "Loki"
availability = "v2.9+"
maintainer = "Community"
description = "Scale applications based on Loki query result."
go_file = "loki_scaler"
+++

### Trigger Specification

This specification describes the `loki` trigger that scales based on a Loki query result. Here is an example of providing values in metadata:

```yaml
triggers:
- type: loki
  metadata:
    # Required fields:
    serverAddress: http://<loki-host>:3100 # Note: loki server URL 
    query: sum(rate({filename="/var/log/syslog"}[1m])) # Note: query must return a vector/scalar single element response
    threshold: '0.7'
    # Optional fields:
    activationThreshold: '2.50'
    tenantName: Tenant1 # Optional. X-Scope-OrgID header for specifying the tenant name in a multi-tenant setup.
    ignoreNullValues: false # Default is `true`, which means ignoring the empty value list from Loki. Set to `false` the scaler will return error when Loki target is lost
    unsafeSsl: false #  Default is `false`, Used for skipping certificate check when having self signed certs for Loki endpoint
```

**Parameter list:**

- `serverAddress` - URL of Loki server.
- `query` - LogQL query to run. The query must return a vector/scalar single element response.
- `threshold` - Value to start scaling for. (This value can be a float)
- `activationThreshold` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional, This value can be a float)
- `tenantName` - The `X-Scope-OrgID` header for specifying the tenant name in a multi-tenant setup. (Optional)
- `ignoreNullValues` - Value to reporting error when Loki target is lost. (Values: `true`,`false`, Default: `true`, Optional)
- `unsafeSsl` - Used for skipping certificate check e.g: using self signed certs. (Values: `true`,`false`, Default: `false`, Optional)
- `authModes` - Authentaication mode to be used. (Values: `bearer`,`basic`, Optional)

### Authentication Parameters

Loki doesn't provide any kind of authentication out of the box. However, most commonly Loki is configured along with a Basic Auth or Bearer Auth, which are the only valid options for authentication here.

You can use `TriggerAuthentication` CRD to configure the authentication. Specify `authModes` and other trigger parameters along with secret credentials in `TriggerAuthentication` as mentioned below:

**Bearer authentication:**
- `authModes`: It must contain `bearer` in case of Bearer Authentication. Specify this in trigger configuration.
- `bearerToken`: The token needed for authentication.

**Basic authentication:**
- `authModes`: It must contain `basic` in case of Basic Authentication. Specify this in trigger configuration.
- `username` - Provide the username to be used for basic authentication.
- `password` - Provide the password to be used for authentication. (Optional, For convenience this has been marked optional as many applications implement basic auth with a username as apikey and password as empty.)

### Example

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: loki-scaledobject
  namespace: default
spec:
  maxReplicaCount: 12
  scaleTargetRef:
    name: nginx
  triggers:
    - type: loki
      metadata:
        serverAddress: http://<loki-host>:3100
        threshold: '0.7'
        query: sum(rate({filename="/var/log/syslog"}[1m]))
```

Here is an example of a loki scaler with Bearer Authentication, where the `Secret` and `TriggerAuthentication` are defined as follows:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-loki-secret
  namespace: default
data:
  bearerToken: "BEARER_TOKEN"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-loki-creds
  namespace: default
spec:
  secretTargetRef:
    - parameter: bearerToken
      name: keda-loki-secret
      key: bearerToken
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: loki-scaledobject
  namespace: default
spec:
  maxReplicaCount: 12
  scaleTargetRef:
    name: nginx
  triggers:
    - type: loki
      metadata:
        serverAddress: http://<loki-host>:3100
        threshold: '0.7'
        query: sum(rate({filename="/var/log/syslog"}[1m]))
        authModes: "bearer"
      authenticationRef:
        name: keda-loki-creds
```

Here is an example of a loki scaler with Basic Authentication, where the `Secret` and `TriggerAuthentication` are defined as follows:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-loki-secret
  namespace: default
data:
  username: dXNlcm5hbWU=
  password: cGFzc3dvcmQ=
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-loki-creds
  namespace: default
spec:
  secretTargetRef:
    - parameter: username
      name: keda-loki-secret
      key: username
    - parameter: password
      name: keda-loki-secret
      key: password
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: loki-scaledobject
  namespace: default
spec:
  maxReplicaCount: 12
  scaleTargetRef:
    name: nginx
  triggers:
    - type: loki
      metadata:
        serverAddress: http://<loki-host>:3100
        threshold: '0.7'
        query: sum(rate({filename="/var/log/syslog"}[1m]))
        authModes: "basic"
      authenticationRef:
        name: keda-loki-creds
```
