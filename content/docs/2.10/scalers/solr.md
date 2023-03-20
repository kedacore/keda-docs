+++
title = "Solr"
availability = "v2.10+"
maintainer = "Community"
description = "Scale applications based on Solr query results."
go_file = "solr_scaler"
+++

### Trigger Specification

This specification describes the solr trigger that scales based on the outputs of a Solr query.

```yaml
triggers:
  - type: solr
    metadata:
      host: "http://solr-service.solr-ns.svc.cluster.local:8983"
      query: "*:*"
      collection: "my_core"
      targetQueryValue: "1"
      activationTargetQueryValue : "3"
      username: "solr"
```

**Parameter list:**

- `host` - The hostname for connecting to the Solr service.
- `query`- A Solr query that should return single numeric value. (Default: `*:*`, Optional)
- `collection` - Your collection name on Solr.
- `targetQueryValue` - A threshold that is used as targetValue or targetAverageValue (depending on the trigger metric type) in HPA. (This value can be a float)
- `activationTargetQueryValue` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional)
- `username` - Username credential to connect to the Solr service.

### Authentication Parameters

You can authenticate by using a password via TriggerAuthentication configuration.

**Credential based authentication:**

- `password` - Password for configured user to login to the Solr instance.

### Example

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: solr-secret
type: Opaque
data:
  solr_password: SOLR_PASSWORD
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: trigger-auth-solr
spec:
  secretTargetRef:
  - parameter: password
    name: solr-secret
    key: solr_password
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: solr-scaledobject
spec:
  scaleTargetRef:
    name: nginx-deploy        
  triggers:
  - type: solr
    metadata:
      host: "http://solr-service.solr-ns.svc.cluster.local:8983"
      query: "*:*"
      collection: "my_core"
      targetQueryValue: "1"
      username: "solr"
    authenticationRef:
      name: trigger-auth-solr
```
