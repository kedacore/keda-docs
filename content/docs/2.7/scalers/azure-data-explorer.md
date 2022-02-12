+++
title = "Azure Data Explorer"
layout = "scaler"
availability = "v2.7+"
maintainer = "Community"
description = "Scale applications based on Azure Data Explorer query result."
go_file = "azure_data_explorer_scaler"
+++

### Trigger Specification

This specification describes the `azure-data-explorer` trigger that scales based on an Azure Data Explorer query result.

```yaml
triggers:
- type: azure-data-explorer
  metadata:
    podIdentity: "azure" # Provide either podIdentity or aad app creds. can use TriggerAuthentication as well
    clientId: "AAD_APP_CLIENT_ID" # Provide either podIdentity or aad app creds. can use TriggerAuthentication as well
    clientSecret: "AAD_APP_SECRET" # Provide either podIdentity or aad app creds. can use TriggerAuthentication as well
    tenantId: "AAD_APP_TENANT_ID" # Provide either podIdentity or aad app creds. can use TriggerAuthentication as well
    databaseName: "DATA_EXPLORER_DATABASE_NAME"
    endpoint: "https://<ClusterName>.<Region>.kusto.windows.net"
    query: |
      StormEvents
      | summarize StormCount = count(), TypeOfStorms = dcount(EventType) by State
      | top 1 by StormCount desc
    threshold: "1000"
    metricName: "DATA_EXPLORER_METRIC_NAME" # Optional
    # Alternatively, you can use existing environment variables to read aad app creds from:
    clientIdFromEnv: AAD_APP_CLIENT_ID_ENV_VAR_NAME # Optional. You can use this instead of `clientId` parameter.
    clientSecretFromEnv: AAD_APP_SECRET_ENV_VAR_NAME # Optional. You can use this instead of `clientSecret` parameter.
    tenantIdFromEnv: AAD_APP_TENANT_ID_ENV_VAR_NAME # Optional. You can use this instead of `tenantId` parameter.
```

This scaler is backed by Azure Data Explorer Goland SDK. Please see [this](https://docs.microsoft.com/en-us/azure/data-explorer/kusto/api/golang/kusto-golang-client-library) page
for further details.

**Parameter list:**
Provide either podIdentity or aad app creds (clientId, clientSecret and tenantId).
- `clientId` - Id of the application from your Azure AD Application/service principal. Follow [this](https://docs.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest) link to create your service principal.
- `clientSecret` - Password from your Azure AD Application/service principal.
- `tenantId` - Id of the Azure Active Directory tenant. Follow [this](https://docs.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest#az-account-show) link to 
retrieve your tenant id. 
- `podIdentity` - [Azure Active Directory pod-managed identity](https://docs.microsoft.com/en-us/azure/aks/use-azure-ad-pod-identity) can be used. Only "azure" is supported. 
- `databaseName` - The name of the Data Explorer Database to query. Use the [Azure Command Line Interface](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) to run `az kusto database list` to see a list of available databases in your cluster.
- `endpoint` - The endpoint to query your Data Explorer Cluster. Follow [this](https://docs.microsoft.com/en-us/cli/azure/kusto/cluster?view=azure-cli-latest#az-kusto-cluster-show) link to get your cluster's endpoint.
- `metricName` - Name to assign to the metric. (Optional, if not set KEDA will generate a name based on the database name)
- `threshold` - Value that is used as a threshold to calculate # of pods for scale target.

The authentication parameters could be provided using environmental variables, instead of setting them directly in metadata. Here is a list of parameters you can use to retrieve values from environment variables:

- `tenantIdFromEnv` - An environmental variable name, that stores Azure Active Directory tenant id. Follow [this](https://docs.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest#az-account-show) link to retrieve your tenant id. (Optional)
- `clientIdFromEnv` - An environmental variable name, that stores Application id from your Azure AD Application/service principal. Follow [this](https://docs.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest) link to create your service principal. (Optional)
- `clientSecretFromEnv` - An environmental variable name, that stores password from your Azure AD Application/service principal. (Optional)

### Query Guidance

It is important to design your query to return 1 row. A good practice is to add "| limit 1" at the end of your query.

Data types of your query result should be: real, int or long. Other data types are not supported. Later, during runtime, your data will be converted to int64.

Be careful with setting up "pollingInterval" and long running queries. Test your query before.

### Authentication Parameters

You can use the `TriggerAuthentication` CRD to configure the authentication by providing a set of Azure Active Directory credentials or by using pod identity.

**Credential based authentication:**

- `clientId` - Application id from your Azure AD Application/service principal. Follow [this](https://docs.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest) link to create your service principal.
- `clientSecret` - Password from your Azure AD Application/service principal.
- `tenantId` - Azure Active Directory tenant id. Follow [this](https://docs.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest#az-account-show) link to retrieve your tenant id.

The principal will need `DatabaseViewer` role to  query metrics from the Data Explorer Cluster. Follow [this](https://docs.microsoft.com/en-us/cli/azure/kusto/database?view=azure-cli-latest#az-kusto-database-add-principal) to assign your principal with the right access permissions through az cli.

**Pod identity based authentication:**

[Azure Active Directory pod-managed identity](https://docs.microsoft.com/en-us/azure/aks/use-azure-ad-pod-identity) can be used.
The identity that being used by pod identity will need `DatabaseViewer` role to particular database query from the Data Explorer Cluster. Follow [this](https://docs.microsoft.com/en-us/cli/azure/kusto/database?view=azure-cli-latest#az-kusto-database-add-principal) to assign your principal with the right access permissions through az cli.

in place of credential based authentication. The following section contains an example of a `TriggerAuthentication` using pod identity.

### Example

The following example illustrates the use of a TriggerAuthentication to connect to Data Explorer.
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: azure-data-explorer-secret
data:
  clientId: <clientId> # Base64 encoded 
  clientSecret: <clientSecret> # Base64 encoded 
  tenantId: <tenantId> # Base64 encoded 
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: azure-data-explorer-trigger-auth
spec:
  secretTargetRef:
    - parameter: clientId
      name: azure-data-explorer-secret
      key: clientId
    - parameter: clientSecret
      name: azure-data-explorer-secret
      key: clientSecret
    - parameter: tenantId
      name: azure-data-explorer-secret
      key: tenantId
  # or Pod Identity, kind: Secret is not required in case of pod Identity
  podIdentity:
      provider: azure
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: azure-data-explorer-scaler
spec:
  scaleTargetRef:
  kind: StatefulSet # Optional: Default: Deployment, Available Options: ReplicaSet Deployment, DaemonSet, StatefulSet
    name: azure-data-explorer-example
  pollingInterval: 30
  cooldownPeriod: 45
  minReplicaCount: 0
  maxReplicaCount: 10
  triggers:
  - type: azure-data-explorer
    metadata:
      databaseName: Weather
      endpoint: https://<ClusterName>.<Region>.kusto.windows.net
      metricName: Storm-Events
      query: |
        StormEvents
        | summarize StormCount = count(), TypeOfStorms = dcount(EventType) by State
        | top 1 by StormCount desc
    threshold: "1000"
    authenticationRef:
      name: azure-data-explorer-trigger-auth
```

The following example illustrates the use of environment variables to connect to Application Insights.
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: azure-data-explorer-secrets
type: Opaque
data:
  clientId: <clientId> # Base64 encoded 
  clientSecret: <clientSecret> # Base64 encoded 
  tenantId: <tenantId> # Base64 encoded 
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: azure-data-explorer-example
spec:
  replicas: 0
  selector:
    matchLabels:
      app: azure-data-explorer-example
  template:
    metadata:
      labels:
        app: azure-data-explorer-example
    spec:
      containers:
      - name: example
        image: nginx:1.16.1
        env:
        - name: AAD_APP_CLIENT_ID
          valueFrom:
            secretKeyRef:
              name: azure-data-explorer-secret
              key: clientId
        - name: AAD_APP_SECRET
          valueFrom:
            secretKeyRef:
              name: azure-data-explorer-secret
              key: clientSecret
        - name: AAD_APP_TENANT_ID
          valueFrom:
            secretKeyRef:
              name: azure-data-explorer-secret
              key: tenantId
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: azure-data-explorer-scaler
spec:
  scaleTargetRef:
    name: azure-data-explorer-example
  pollingInterval: 30
  cooldownPeriod: 45
  minReplicaCount: 0
  maxReplicaCount: 10
  triggers:
    - type: azure-data-explorer
      metadata:
        clientIdFromEnv: AAD_APP_CLIENT_ID
        clientSecretFromEnv: AAD_APP_SECRET
        tenantIdFromEnv: AAD_APP_TENANT_ID
        databaseName: Weather
        endpoint: https://<ClusterName>.<Region>.kusto.windows.net
        metricName: Storm-Events
        query: |
          StormEvents
          | summarize StormCount = count(), TypeOfStorms = dcount(EventType) by State
          | top 1 by StormCount desc
        threshold: "1000"
```
