+++
title = "Azure Data Explorer"
availability = "v2.7+"
maintainer = "Microsoft"
description = "Scale applications based on Azure Data Explorer query result."
go_file = "azure_data_explorer_scaler"
+++

### Trigger Specification

This specification describes the `azure-data-explorer` trigger that scales based on an Azure Data Explorer query result.

```yaml
triggers:
- type: azure-data-explorer
  metadata:
    endpoint: https://keda.eastus.kusto.windows.net
    databaseName: kedadb
    query: |
      StormEvents
      | summarize StormCount = count() by State
      | top 1 by StormCount desc
    threshold: "10.5"
    activationThreshold: "10.5"
    tenantId: 045ef409-6dee-4893-a824-5612eac467b1 # Can use TriggerAuthentication as well
    clientId: 4ba039f1-d69c-434e-9268-4a2bb7bba90d # Can use TriggerAuthentication as well
    clientSecret: t0p-s3cret  # DEPRECATED, use TriggerAuthentication or clientSecretFromEnv
    # Alternatively, you can use existing environment variables to read aad app creds from:
    clientIdFromEnv: AAD_APP_CLIENT_ID_ENV_VAR_NAME # Optional. You can use this instead of `clientId` parameter.
    clientSecretFromEnv: AAD_APP_SECRET_ENV_VAR_NAME # Optional. You can use this instead of `clientSecret` parameter.
    tenantIdFromEnv: AAD_APP_TENANT_ID_ENV_VAR_NAME # Optional. You can use this instead of `tenantId` parameter.
    # Optional (Default: AzurePublicCloud)
    cloud: Private
    # Required when cloud = Private.
    activeDirectoryEndpoint: https://login.airgap.example/
```

**Parameter list:**

- `endpoint` - The endpoint to query your Data Explorer Cluster.
- `databaseName` - The name of the Data Explorer Database to query.
- `query` - Data Explorer query.
- `threshold` - Value that is used as a threshold to calculate # of pods for scale target. (This value can be a float)
- `activationThreshold` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional, This value can be a float)
- `tenantId` - Id of the Azure AD tenant.
- `clientId` - Id of the Azure AD application.
- `clientSecret` - Password of the Azure AD application. (DEPRECATED: This parameter is deprecated as of KEDA v2.11 and will be removed in version `2.13`)
- `cloud` - Name of the cloud environment that the Azure Data Explorer cluster belongs to. (Values: `AzurePublicCloud`, `AzureUSGovernmentCloud`, `AzureChinaCloud`, `Private`, Default: `AzurePublicCloud`, Optional)
- `activeDirectoryEndpoint` - Active Directory endpoint of the cloud environment. (Required when `cloud` is set to `Private`, e.g. `https://login.chinacloudapi.cn/` for `AzureChinaCloud`).

The authentication parameters could be provided using environmental variables, instead of setting them directly in metadata. Here is a list of parameters you can use to retrieve values from environment variables:

- `tenantIdFromEnv` - An environmental variable name, that stores Azure AD tenant id. (Optional)
- `clientIdFromEnv` - An environmental variable name, that stores application id of your Azure AD Application. (Optional)
- `clientSecretFromEnv` - An environmental variable name, that stores password of the Azure AD application. (Optional)

### Query Guidance

It is important to design your query to return 1 row. A good practice is to add `| limit 1` at the end of your query.

The only supported data types for your query result are `real`, `int` or `long`.

Be careful with defining `pollingInterval` and using long-running queries. Make sure to test your query before using it.

### Authentication Parameters

You can use the `TriggerAuthentication` CRD to configure the authentication by providing a set of Azure Active Directory credentials or by using pod identity.

The AD identity that will be used requires `DatabaseViewer` role to query metrics from the Data Explorer Cluster.

💡You can use [this guide ](https://docs.microsoft.com/en-us/cli/azure/kusto/database?view=azure-cli-latest#az-kusto-database-add-principal) to assign your principal with the right access permissions through the Azure CLI.

**Credential based authentication:**

- `clientId` - Id of the Azure AD application. Use [this](https://docs.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest) guide to create your service principal.
- `clientSecret` - Password of the Azure AD application.
- `tenantId` - Id of the Azure AD tenant. Use [this](https://docs.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest#az-account-show) guide to retrieve your tenant id.

**Pod identity based authentication:**

[Azure AD Pod Identity](https://docs.microsoft.com/en-us/azure/aks/use-azure-ad-pod-identity) or [Azure AD Workload Identity](https://azure.github.io/azure-workload-identity/docs/) providers can be used.

### Examples

### Use TriggerAuthentication with Azure AD Application

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
      name: azure-data-explorer-secret # Required. Refers to the name of the secret
      key: clientId
    - parameter: clientSecret
      name: azure-data-explorer-secret
      key: clientSecret
    - parameter: tenantId
      name: azure-data-explorer-secret
      key: tenantId
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
      endpoint: https://keda.eastus.kusto.windows.net
      query: |
        StormEvents
        | summarize StormCount = count() by State
        | top 1 by StormCount desc
    threshold: "1000"
    authenticationRef:
      name: azure-data-explorer-trigger-auth
```

### Use TriggerAuthentication with Azure Pod Identity

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: azure-data-explorer-trigger-auth
spec:
  podIdentity:
      provider: azure | azure-workload
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
      endpoint: https://keda.eastus.kusto.windows.net
      query: |
        StormEvents
        | summarize StormCount = count() by State
        | top 1 by StormCount desc
    threshold: "1000"
    authenticationRef:
      name: azure-data-explorer-trigger-auth
```

### Use TriggerAuthentication with Azure AD Application through environment variables

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
        endpoint: https://keda.eastus.kusto.windows.net
        query: |
          StormEvents
          | summarize StormCount = count() by State
          | top 1 by StormCount desc
        threshold: "1000"
```
