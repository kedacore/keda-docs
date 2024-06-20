+++
title = "Neo4j"
availability = "v2.10+"
maintainer = "Community"
description = "Scale applications based on Neo4j query results."
go_file = "neo4j_scaler"
+++

### Trigger Specification

This specification describes the `neo4j` trigger that scales based on the outputs of a Neo4j query.

```yaml
triggers:
- type: neo4j
  metadata:
    connectionStringFromEnv: "CONNECTION_STRING"
    host: "test-release.neo4j-test-ns.svc.cluster.local"   
    port: "7687" 
    queryValue: "9" 
    query: 'MATCH (n:Person)<-[r:FOLLOWS]-() WHERE n.popularfor IS NOT NULL RETURN n,COUNT(r) order by COUNT(r) desc LIMIT 1'
    activationQueryValue: "9"
```

**Parameter list:**

- `host` - The hostname for connecting to the Neo4j service. (Optional, Required if `connectionString` and `connectionStringFromEnv` is not set)
- `queryValue` - A threshold that will define when scaling should occur. (Optional, Required if `connectionString` and `connectionStringFromEnv` is not set)
- `port` - The port number of the Neo4j service. (Optional, Required if `connectionString` and `connectionStringFromEnv` is not set)
- `query` - A Neo4j query that should return single numeric value. (Optional)
- `activationQueryValue` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional)
- `connectionStringFromEnv` - Environment variable from workload with the connection string. (Optional, Required if `connectionString` and connection parameters aren't set)

### Authentication Parameters

You can authenticate by using a username and password via `TriggerAuthentication` configuration.

**Connection String:**

- `connectionString` - Connection string for Neo4j cluster. (Optional, Required if `connectionStringFromEnv` and connection parameters aren't set)

**Password Authentication:**

- `password` - Password for configured user to login to the Neo4j instance.
- `username` - Username for configured user to login to the Neo4j instance.

### Example

Here is an example of a neo4j scaler with Basic Authentication, where the `Secret` and `TriggerAuthentication` are defined as follows:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: neo4j-secrets
data:
  username: NEO4J_USERNAME
  password: NEO4J_PASSWORD
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-neo4j-secret
spec:
  secretTargetRef:
  - parameter: password
    name: neo4j-secrets
    key: password
  - parameter: username
    name: neo4j-secrets
    key: username
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: neo4j-scaled-object
spec:
  scaleTargetRef:
    name: nginx-deployment
  triggers:
  - type: neo4j
    metadata:
      hostname: "test-release.neo4j-test-ns.svc.cluster.local"
      port: "7687"
      dbName: "animals"
      query: 'MATCH (n:Person)<-[r:FOLLOWS]-() WHERE n.popularfor IS NOT NULL RETURN n,COUNT(r) order by COUNT(r) desc LIMIT 1'
      activationQueryValue: "9"
      metricName: "global-metric"
    authenticationRef:
      name: keda-trigger-auth-neo4j-secret
```
