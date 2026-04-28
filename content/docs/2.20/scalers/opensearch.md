+++
title = "OpenSearch"
availability = "v2.20+"
maintainer = "Community"
category = "Data & Storage"
description = "Scale applications based on 'opensearch search template query' or 'opensearch query' result."
go_file = "opensearch_scaler"
+++

### Trigger Specification

This specification describes the `opensearch` trigger that scales based on result of an [OpenSearch search template](https://opensearch.org/docs/latest/search-plugins/search-template/) query or [OpenSearch query](https://opensearch.org/docs/latest/query-dsl/).

The trigger requires `addresses`, `index`, `valueLocation`, and `targetValue`. Either `searchTemplateName` **or** `query` must also be specified, but not both. All other parameters are optional.

The following example shows all available parameters (use either `searchTemplateName` **or** `query`, not both):

```yaml
triggers:
  - type: opensearch
    metadata:
      addresses: "https://localhost:9200"        # required
      index: "my-index"                          # required
      valueLocation: "hits.total.value"          # required
      targetValue: "1.1"                         # required
      searchTemplateName: "my-search-template"   # required if query is not set
      # query: "my-query"                        # required if searchTemplateName is not set
      username: "admin"                          # optional
      passwordFromEnv: "OPENSEARCH_PASSWORD"     # optional
      parameters: "param1:value1;param2:value2"  # optional
      activationTargetValue: "5.5"              # optional, default: 0
      unsafeSsl: "false"                        # optional, default: false
      enableTLS: "false"                        # optional, default: false
      # caCert: "..."                           # optional, for mTLS (use TriggerAuthentication to avoid plain text)
      # clientCert: "..."                       # optional, for mTLS (use TriggerAuthentication to avoid plain text)
      # clientKey: "..."                        # optional, for mTLS (use TriggerAuthentication to avoid plain text)
      ignoreNullValues: "false"                 # optional, default: false
```

**Parameter list:**

- `addresses` - Comma separated list of hosts and ports of the OpenSearch cluster client nodes.
- `username` - Username to authenticate with to OpenSearch cluster. (Optional)
- `passwordFromEnv` - Environment variable to read the authentication password from to authenticate with the OpenSearch cluster. (Optional)
- `index` - Index to run the search template query on. It supports multiple indexes separated by a semicolon character ( `;` ).
- `searchTemplateName` - The search template name to run. (Optional, but either this or `query` must be specified)
- `query` - The query to run. (Optional, but either this or `searchTemplateName` must be specified)
- `targetValue` - Target value to scale on. When the metric provided by the API is equal or higher to this value, KEDA will start scaling out. When the metric is 0 or less, KEDA will scale down to 0. (This value can be a float)
- `activationTargetValue` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional, This value can be a float)
- `parameters` - Parameters that will be used by the search template or query. It supports multiple params separated by a semicolon character ( `;` ). (Optional)
- `valueLocation` - [GJSON path notation](https://github.com/tidwall/gjson#path-syntax) to refer to the field in the payload containing the metric value.
- `unsafeSsl` - Skip certificate validation when connecting over HTTPS. (Values: `true`, `false`, Default: `false`, Optional)
- `enableTLS` - Enable TLS for connection. Must be set to `true` when using mTLS certificate authentication. (Values: `true`, `false`, Default: `false`, Optional)
- `caCert` - Certificate authority (CA) certificate for mTLS authentication. (Optional)
- `clientCert` - Client certificate for mTLS authentication. (Optional)
- `clientKey` - Client key for mTLS authentication. (Optional)
- `ignoreNullValues` - Set to `true` to ignore error when Null values are discovered. Set to `false`, the scaler will return error when Null values are discovered. (Values: `true`,`false`, Default: `false`, Optional)

### Authentication Parameters

You can authenticate by using username/password or mutual TLS (mTLS) certificate authentication.

**Password Authentication:**

- `username` - Username to authenticate with to OpenSearch cluster.
- `password` - Password for configured user to login to OpenSearch cluster.

**Mutual TLS (mTLS) Certificate Authentication:**

- `caCert` - Certificate authority (CA) certificate for TLS client authentication.
- `clientCert` - Client certificate for TLS client authentication.
- `clientKey` - Client key for TLS client authentication.

When using mTLS authentication, you must also set `enableTLS: "true"` in the trigger metadata.

### Examples

#### Example 1: Username and Password Authentication with Search Template

Here is an example of how to deploy a scaled object with the `opensearch` scale trigger which uses a search template and `TriggerAuthentication` for username/password authentication.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: opensearch-secrets
type: Opaque
data:
  password: cGFzc3cwcmQh
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-opensearch-secret
spec:
  secretTargetRef:
  - parameter: password
    name: opensearch-secrets
    key: password
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: opensearch-scaledobject
spec:
  scaleTargetRef:
    name: "deployment-name"
  triggers:
    - type: opensearch
      metadata:
        addresses: "https://localhost:9200"
        username: "admin"
        index: "my-index"
        searchTemplateName: "my-search-template"
        valueLocation: "hits.total.value"
        targetValue: "10"
        parameters: "dummy_value:1"
      authenticationRef:
        name: keda-trigger-auth-opensearch-secret
```

#### Example 2: Username and Password Authentication with Query

Here is an example of how to deploy a scaled object with the `opensearch` scale trigger which uses a `query`. In this example, transactions will be counted that the application has to process.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: opensearch-secrets
type: Opaque
data:
  password: cGFzc3cwcmQh
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-opensearch-secret
spec:
  secretTargetRef:
  - parameter: password
    name: opensearch-secrets
    key: password
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: opensearch-scaledobject
spec:
  scaleTargetRef:
    name: "deployment-name"
  triggers:
    - type: opensearch
      metadata:
        addresses: "https://localhost:9200"
        username: "admin"
        index: "my-index"
        query: |
          {
            "size": 0,
            "query": {
              "bool": {
                "must": [
                  {
                    "term": {
                      "service.name": "my-application" }
                  },
                  {
                    "term": {
                      "service.environment": "production" }
                  },
                  {
                    "range": {
                      "@timestamp": {
                        "gte": "now-2m",
                        "lte": "now-1m"
                      }
                    }
                  }
                ]
              }
            },
            "aggs": {
              "transaction_count": {
                "cardinality": {
                  "field": "transaction.id" }
              }
            }
          }
        valueLocation: "aggregations.transaction_count.value"
        targetValue: "1000"
      authenticationRef:
        name: keda-trigger-auth-opensearch-secret
```

#### Example 3: Mutual TLS (mTLS) Certificate Authentication

Here is an example of how to deploy a scaled object with the `opensearch` scale trigger which uses mutual TLS certificate authentication. This approach is more secure than username/password authentication as it uses client certificates.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: opensearch-tls-secrets
type: Opaque
data:
  ca.crt: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t...  # Base64 encoded CA certificate
  client.crt: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t...  # Base64 encoded client certificate
  client.key: LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0t...  # Base64 encoded client key
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-opensearch-tls
spec:
  secretTargetRef:
  - parameter: caCert
    name: opensearch-tls-secrets
    key: ca.crt
  - parameter: clientCert
    name: opensearch-tls-secrets
    key: client.crt
  - parameter: clientKey
    name: opensearch-tls-secrets
    key: client.key
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: opensearch-scaledobject
spec:
  scaleTargetRef:
    name: "deployment-name"
  triggers:
    - type: opensearch
      metadata:
        addresses: "https://localhost:9200"
        enableTLS: "true"
        index: "my-index"
        searchTemplateName: "my-search-template"
        valueLocation: "hits.total.value"
        targetValue: "10"
        parameters: "dummy_value:1"
      authenticationRef:
        name: keda-trigger-auth-opensearch-tls
```

#### Example 4: Mutual TLS with Query and Multiple Indexes

Here is an example combining mTLS authentication with a custom query across multiple indexes:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: opensearch-tls-secrets
type: Opaque
data:
  ca.crt: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t...  # Base64 encoded CA certificate
  client.crt: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t...  # Base64 encoded client certificate
  client.key: LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0t...  # Base64 encoded client key
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-opensearch-tls
spec:
  secretTargetRef:
  - parameter: caCert
    name: opensearch-tls-secrets
    key: ca.crt
  - parameter: clientCert
    name: opensearch-tls-secrets
    key: client.crt
  - parameter: clientKey
    name: opensearch-tls-secrets
    key: client.key
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: opensearch-scaledobject
spec:
  scaleTargetRef:
    name: "deployment-name"
  triggers:
    - type: opensearch
      metadata:
        addresses: "https://opensearch-node1:9200,https://opensearch-node2:9200"
        enableTLS: "true"
        index: "logs-2024;logs-2025;logs-2026"
        query: |
          {
            "query": {
              "bool": {
                "filter": [
                  {
                    "range": {
                      "@timestamp": {
                        "gte": "now-5m"
                      }
                    }
                  },
                  {
                    "term": {
                      "status": "pending"
                    }
                  }
                ]
              }
            }
          }
        valueLocation: "hits.total.value"
        targetValue: "100"
        activationTargetValue: "10"
        ignoreNullValues: "true"
      authenticationRef:
        name: keda-trigger-auth-opensearch-tls
```
