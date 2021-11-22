+++
title = "Elasticsearch"
availability = "v2.5+"
maintainer = "Community"
description = "Scale applications based on elasticsearch search template query result."
layout = "scaler"
+++

### Trigger Specification

This specification describes the `elasticsearch` trigger that scales based on result of an [elasticsearch search template](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-template.html) query.

The trigger always requires the following information:

```yaml
triggers:
  - type: elasticsearch
    metadata:
      addresses: "http://localhost:9200"
      username: "elastic"
      passwordFromEnv: "ELASTIC_PASSWORD"
      index: "my-index"
      searchTemplateName: "my-search-template-name"
      params: "param1:value1;param2:value2"
      valueLocation: "hits.total.value"
      targetValue: "1"
```

**Parameter list:**

- `addresses` - Comma separated list of hosts and ports of the Elasticsearch cluster client nodes.
- `username` - Username to authenticate with to Elasticsearch cluster.
- `passwordFromEnv` - Environment variable to read the authentication password from to authenticate with the Elasticsearch cluster.
- `index` - Comma separated list of indexes to run the search template query on.
- `searchTemplateName` - The search template name to run.
- `targetValue` - Target value to scale on. When the metric provided by the API is equal or higher to this value, KEDA will start scaling out. When the metric is 0 or less, KEDA will scale down to 0.
- `parameters` - Parameters that will be used by the search template. It supports multiples params separated by a semicolon character ( `;` ).
- `valueLocation` - [GJSON path notation](https://github.com/tidwall/gjson#path-syntax) to refer to the field in the payload containing the metric value.
- `unsafeSsl` - Skip certificate validation when connecting over HTTPS. (Values: `true`, `false`, Default: `false`, Optional)

### Authentication Parameters

You can authenticate by using a username/password authentication.

**Password Authentication:**

- `username` - Username to authenticate with to Elasticsearch cluster.
- `password` - Password for configured user to login to Elasticsearch cluster.

### Example

Here is an example of how to deploy a scaled object with the `elasticsearch` scale trigger which uses `TriggerAuthentication`.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: elasticsearch-secrets
type: Opaque
data:
  password: cGFzc3cwcmQh
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-elasticsearch-secret
spec:
  secretTargetRef:
  - parameter: password
    name: elasticsearch-secrets
    key: password
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: elasticsearch-scaledobject
spec:
  scaleTargetRef:
    name: "deployment-name"
  triggers:
    - type: elasticsearch
      metadata:
        addresses: "http://localhost:9200"
        username: "elastic"
        index: "my-index"
        searchTemplateName: "my-search-template"
        valueLocation: "hits.total.value"
        targetValue: "10"
        params: "dummy_value:1"
      authenticationRef:
        name: keda-trigger-auth-elasticsearch-secret
``` 
