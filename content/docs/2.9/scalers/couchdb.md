+++
title = "CouchDB"
availability = "v2.9+"
maintainer = "Community"
description = "Scale applications based on CouchDB query results."
go_file = "couchdb_scaler"
+++

### Trigger Specification

This specification describes the `couchdb` trigger that scales based on the outputs of a CouchDB query.

```yaml
triggers:
- type: couchdb
  metadata:
    connectionString: "http://admin:password@test-release-svc-couchdb.couchdb-test-ns.svc.cluster.local:5984/"
    hostname: "test-release-svc-couchdb.couchdb-test-ns.svc.cluster.local"   
    port: "5984" 
    dbName: "animals" 
    queryValue: "1" 
    query: '{ "selector": { "feet": { "$gt": 0 } }, "fields": ["_id", "feet", "greeting"] }'
    activationQueryValue: "1"
```

**Parameter list:**

- `host` - The hostname for connecting to the CouchDB service.
- `dbName` - Name of the database.
- `queryValue` - A threshold that will define when scaling should occur.
- `port` - The port number of the CouchDB service.
- `query` - A CouchDB query that should return single numeric value.
- `activationQueryValue` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional)
- `connectionString` - Connection string for CouchDB database.

### Authentication Parameters

You can authenticate by using a username and password via `TriggerAuthentication` configuration.

**Password Authentication:**

- `password` - Password for configured user to login to the Couchdb instance.
- `username` - Username for configured user to login to the Couchdb instance.

### Example

Here is an example of a couchdb scaler with Basic Authentication, where the `Secret` and `TriggerAuthentication` are defined as follows:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: couchdb-secrets
data:
  username: COUCHDB_USERNAME
  password: COUCHDB_PASSWORD
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-couchdb-secret
spec:
  secretTargetRef:
  - parameter: password
    name: couchdb-secrets
    key: password
  - parameter: username
    name: couchdb-secrets
    key: username
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: couchdb-scaledobject
spec:
  scaleTargetRef:
    name: nginx-deployment
  triggers:
  - type: couchdb
    metadata:
      hostname: "test-release-svc-couchdb.couchdb-test-ns.svc.cluster.local"
      port: "5984"
      dbName: "animals"
      queryValue: "1"
      query: '{ "selector": { "feet": { "$gt": 0 } }, "fields": ["_id", "feet", "greeting"] }'
      activationQueryValue: "1"
      metricName: "global-metric"
    authenticationRef:
      name: keda-trigger-auth-couchdb-secret
```
