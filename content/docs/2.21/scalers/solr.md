+++
title = "Solr"
availability = "v2.11+"
maintainer = "Community"
category = "Metrics"
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
```

**Parameter list:**

- `host` - The hostname for connecting to the Solr service.
- `query`- A Solr query that should return single numeric value. (Default: `*:*`, Optional)
- `collection` - Your collection name on Solr.
- `targetQueryValue` - A threshold that is used as targetValue or targetAverageValue (depending on the trigger metric type) in HPA. (This value can be a float)
- `activationTargetQueryValue` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)

### Authentication Parameters

You can authenticate by using a password via TriggerAuthentication configuration.

**Credential based authentication:**

- `username` - Username for configured user to login to the Solr instance.
- `password` - Password for configured user to login to the Solr instance.

### Example

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: solr-secret
type: Opaque
data:
  solr_username: SOLR_USERNAME
  solr_password: SOLR_PASSWORD
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: trigger-auth-solr
spec:
  secretTargetRef:
  - parameter: username
    name: solr-secret
    key: solr_username
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
    authenticationRef:
      name: trigger-auth-solr
```
