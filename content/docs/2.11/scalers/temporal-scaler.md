+++
title = "Temporal Scaler"
availability = "v2.12+"
maintainer = "Community"
description = "Scale applications based on Temporal Open Workflows"
+++

### Trigger Specification

This specification describes the `Temporal` trigger that scales based on Temporal Open Workflows.

```yaml
triggers:
  - type: temporal
    metadata:
      # Required fields
      address: 10.0.4.118:7233 
      threshold: '10'
      # Optional fields
      namespace: example-namespace
      serverName: "tls-sample"
      activationThreshold: '50'
      authModes: "tls" # Only tls is supported at the moment. Do not include this field for unsecured connectivity with Temporal.
```

**Parameter list:**

- `address` - The address of the Temporal Service.
- `threshold` - Value to start scaling for. (This value can be a float)
- `activationThreshold` - Target value for activating the scaler. Learn more about activation [here](https://keda.sh/docs/2.10/concepts/scaling-deployments/#activating-and-scaling-thresholds). 
- `namespace` - Namespace of the Temporal Workflow. Default is 'default'.
- `serverName` - If you are using a self signed certificate, you can provide the name 
- `authModes` - Add this field with 'tls' if you need to communicate with Temporal using mTLS communication.



### Authentication Parameters

Temporal Scaler currently supports mTLS authentication to communicate with the Temporal Service.

You can use `TriggerAuthentication` CRD to configure the authentication by providing a set of secrets representing a TLS Certificate.

**TLS based authentication:**

- `authModes`: The only valid value for this is `tls`.
- `ca` - Certificate authority file for TLS client authentication.
- `cert` - Certificate for client authentication. This is a required field.
- `key` - Key for client authentication. Optional. This is a required field.

### Example

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: temporal-scaledobject
  namespace: temporal-samples-k8s
spec:
  scaleTargetRef:
    name: temporal-worker-app
  pollingInterval: 15
  cooldownPeriod:  200
  minReplicaCount: 1
  maxReplicaCount: 50
  triggers:
  - type: temporal
    metadata:
      address: 10.0.4.118:7233
      threshold: '10'
```

Here is an example of a temporal scaler with mTLS Authentication, define the `Secret` and `TriggerAuthentication` as follows
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-temporal-secret
  namespace: temporal-samples-k8s
data:
  cert: "LS0tLS1CR..."
  key: "LS0tLS1CR..."
  ca: "LS0tLS1CR..."
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-temporal-creds
  namespace: temporal-samples-k8s
spec:
  secretTargetRef:
    - parameter: cert
      name: keda-temporal-secret
      key: cert
    - parameter: key
      name: keda-temporal-secret
      key: key
    - parameter: ca
      name: keda-temporal-secret
      key: ca
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: temporal-scaledobject
  namespace: temporal-samples-k8s
spec:
  scaleTargetRef:
    name: temporal-worker-app
  pollingInterval: 20
  cooldownPeriod:  200
  minReplicaCount: 1
  maxReplicaCount: 50
  triggers:
  - type: temporal
    authenticationRef:
      name: keda-temporal-creds
    metadata:
      address: 10.0.4.118:7233
      serverName: "tls-sample"
      namespace: default
      threshold:           '10'      
      activationThreshold: '50'
      authModes: "tls"
```