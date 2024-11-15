+++
title = "Azure Log Analytics"
availability = "v2.0+"
maintainer = "Microsoft"
category = "Data & Storage"
description = "Scale applications based on Azure Log Analytics query result"
go_file = "azure_log_analytics_scaler"
+++

### Trigger Specification

This specification describes the `azure-log-analytics` trigger for Azure Log Analytics query result. Here is an example of providing values in metadata:

```yaml
triggers:
  - type: azure-log-analytics
    metadata:
      tenantId: "AZURE_AD_TENANT_ID"
      clientId: "SERVICE_PRINCIPAL_CLIENT_ID"
      clientSecret: "SERVICE_PRINCIPAL_PASSWORD"
      workspaceId: "LOG_ANALYTICS_WORKSPACE_ID"
      query: |
        let AppName = "web";
        let ClusterName = "demo-cluster";
        let AvgDuration = ago(10m);
        let ThresholdCoefficient = 0.8;
        Perf
        | where InstanceName contains AppName
        | where InstanceName contains ClusterName
        | where CounterName == "cpuUsageNanoCores"
        | where TimeGenerated > AvgDuration
        | extend AppName = substring(InstanceName, indexof((InstanceName), "/", 0, -1, 10) + 1)
        | summarize MetricValue=round(avg(CounterValue)) by CounterName, AppName
        | join (Perf
                | where InstanceName contains AppName
                | where InstanceName contains ClusterName
                | where CounterName == "cpuLimitNanoCores"
                | where TimeGenerated > AvgDuration
                | extend AppName = substring(InstanceName, indexof((InstanceName), "/", 0, -1, 10) + 1)
                | summarize arg_max(TimeGenerated, *) by AppName, CounterName
                | project Limit = CounterValue, TimeGenerated, CounterPath, AppName)
                on AppName
        | project MetricValue, Threshold = Limit * ThresholdCoefficient
      threshold: "10.7"
      activationThreshold: "1.7"
      # Alternatively, you can use existing environment variables to read configuration from:
      # See details in "Parameter list" section
      workspaceIdFromEnv: LOG_ANALYTICS_WORKSPACE_ID_ENV_NAME # Optional. You can use this instead of `workspaceId` parameter.
      clientIdFromEnv: SERVICE_PRINCIPAL_CLIENT_ID_ENV_NAME # Optional. You can use this instead of `clientId` parameter.
      tenantIdFromEnv: AZURE_AD_TENANT_ID_ENV_NAME # Optional. You can use this instead of `tenantId` parameter.
      clientSecretFromEnv: SERVICE_PRINCIPAL_PASSWORD_ENV_NAME # Optional. You can use this instead of `clientSecret` parameter.
      # Optional (Default: AzurePublicCloud)
      cloud: Private
      # Required when cloud = Private
      logAnalyticsResourceURL: https://api.loganalytics.airgap.io/
      # Required when cloud = Private.
      activeDirectoryEndpoint: https://login.airgap.example/
      # Optional (Default: false)
      unsafeSsl: "false"
```

**Parameter list:**

- `tenantId` - Id of the Azure Active Directory tenant. Follow [this](https://docs.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest#az-account-show) link to retrieve your tenant id.
- `clientId` - Id of the application from your Azure AD Application/service principal. Follow [this](https://docs.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest) link to create your service principal.
- `clientSecret` - Password from your Azure AD Application/service principal.
- `workspaceId` - Id of Log Analytics workspace. Follow [this](https://docs.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace?view=azure-cli-latest#az-monitor-log-analytics-workspace-list) link to get your Log Analytics workspace id.
- `query` - Log Analytics [kusto](https://docs.microsoft.com/en-us/azure/azure-monitor/log-query/get-started-queries) query, JSON escaped. You can use [this](https://www.freeformatter.com/json-escape.html) tool to convert your query from Log Analytics query editor to JSON escaped string, and then review YAML specific escapes.
- `threshold` - Value that is used as a threshold to calculate # of pods for scale target. (This value can be a float)
- `activationThreshold` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional, This value can be a float)
- `cloud` - Name of the cloud environment that the Azure Log Analytics workspace belongs to. (Values: `AzurePublicCloud`, `AzureUSGovernmentCloud`, `AzureChinaCloud`, `Private`, Default: `AzurePublicCloud`, Optional)
- `logAnalyticsResourceURL` - Log Analytics REST API URL of the cloud environment. (Required when `cloud` is set to `Private`, e.g. `https://api.loganalytics.azure.cn/` for `AzureChinaCloud`).
- `activeDirectoryEndpoint` - Active Directory endpoint of the cloud environment. (Required when `cloud` is set to `Private`, e.g. `https://login.chinacloudapi.cn/` for `AzureChinaCloud`).
- `unsafeSsl` - Determines whether or not KEDA will verify the server certificate's chain and host name. (Default: `false`, Optional, This value can be a bool)


The authentication parameters could be provided using environmental variables, instead of setting them directly in metadata. Here is a list of parameters you can use to retrieve values from environment variables:

- `tenantIdFromEnv` - An environmental variable name, that stores Azure Active Directory tenant id. Follow [this](https://docs.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest#az-account-show) link to retrieve your tenant id. (Optional)
- `clientIdFromEnv` - An environmental variable name, that stores Application id from your Azure AD Application/service principal. Follow [this](https://docs.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest) link to create your service principal. (Optional)
- `clientSecretFromEnv` - An environmental variable name, that stores password from your Azure AD Application/service principal. (Optional)
- `workspaceIdFromEnv` - An environmental variable name, that stores your Log Analytics workspace id. Follow [this](https://docs.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace?view=azure-cli-latest#az-monitor-log-analytics-workspace-list) link to get your Log Analytics workspace id. (Optional)

> 💡 **NOTE:** The workspaceID for Log Analytics is called the `customerId`;
it's not the full `id`! the example `az` command below can be used.

```sh
az monitor log-analytics workspace list --query '[]. {ResourceGroup:resourceGroup,WorkspaceName:name,"workspaceID (customerId)":customerId}' -o table
```

### Query Guidance

It is important to design your query to return 1 table with 1 row. A good practice is to add "| limit 1" at the end of your query.

Scaler will take value from:

- 1st cell as Metrics Value.
- 2nd cell as Threshold (optional).

You can define threshold in trigger metadata, it will be used if your query results only 1 cell, that will be interpreted as metric value. Be aware, even if you have defined threshold in metadata, it can be overwritten by your query.

Data types of your query result should be: real, int or long. Other data types are not supported. Later, during runtime, your data will be converted to int64.

Be careful with setting up "pollingInterval" and long-running queries. Test your query before.

Example query to get `MetricValue` and `Threshold` based on CPU usage and limits, defined for the pod.

```kusto
let AppName = "web";
let ClusterName = "demo-cluster";
let AvgDuration = ago(10m);
let ThresholdCoefficient = 0.8;
Perf
| where InstanceName contains AppName
| where InstanceName contains ClusterName
| where CounterName == "cpuUsageNanoCores"
| where TimeGenerated > AvgDuration
| extend AppName = substring(InstanceName, indexof((InstanceName), "/", 0, -1, 10) + 1)
| summarize MetricValue=round(avg(CounterValue)) by CounterName, AppName
| join (Perf
        | where InstanceName contains AppName
        | where InstanceName contains ClusterName
        | where CounterName == "cpuLimitNanoCores"
        | where TimeGenerated > AvgDuration
        | extend AppName = substring(InstanceName, indexof((InstanceName), "/", 0, -1, 10) + 1)
        | summarize arg_max(TimeGenerated, *) by AppName, CounterName
        | project Limit = CounterValue, TimeGenerated, CounterPath, AppName)
        on AppName
| project MetricValue, Threshold = Limit * ThresholdCoefficient
```

Example result:

![Azure Log Analytics query example](/img/azure-log-analytics-scaler-query-example.png)

### Scaler Limitations

- As it was mentioned before, you can define a threshold using query (2nd cell of query result will be interpret as threshold). Be aware! Threshold from query result will be set only once, during scaler creation. So, if your query will return different threshold values during runtime, they will not be propagated to Horizontal Pod Autoscaler target.

### Authentication Parameters

You can use `TriggerAuthentication` CRD to configure the authentication by providing a set of Azure Active Directory credentials and resource identifiers.

**Service Principal based authentication:**

- `tenantId` - Azure Active Directory tenant id. Follow [this](https://docs.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest#az-account-show) link to retrieve your tenant id.
- `clientId` - Application id from your Azure AD Application/service principal. Follow [this](https://docs.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest) link to create your service principal.
- `clientSecret` - Password from your Azure AD Application/service principal.
- `workspaceId` - Your Log Analytics workspace id. Follow [this](https://docs.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace?view=azure-cli-latest#az-monitor-log-analytics-workspace-list) link to get your Log Analytics workspace id.

**Managed identity based authentication:**

You can use managed identity to request access token for Log Analytics API. The advantage of this approach is that there is no need to store secrets in Kubernetes. Read [more](https://docs.microsoft.com/en-us/azure/aks/use-managed-identity) about managed identities in Azure Kubernetes Service.

[Azure AD Workload Identity](https://azure.github.io/azure-workload-identity/docs/) provider can be used.

### Example

#### Service Principal based authentication

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: kedaloganalytics
  namespace: kedaloganalytics
  labels:
    app: kedaloganalytics
type: Opaque
data:
  tenantId: "QVpVUkVfQURfVEVOQU5UX0lE" #Base64 encoded Azure Active Directory tenant id
  clientId: "U0VSVklDRV9QUklOQ0lQQUxfQ0xJRU5UX0lE" #Base64 encoded Application id from your Azure AD Application/service principal
  clientSecret: "U0VSVklDRV9QUklOQ0lQQUxfUEFTU1dPUkQ=" #Base64 encoded Password from your Azure AD Application/service principal
  workspaceId: "TE9HX0FOQUxZVElDU19XT1JLU1BBQ0VfSUQ=" #Base64 encoded Log Analytics workspace id
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: trigger-auth-kedaloganalytics
  namespace: kedaloganalytics
spec:
  secretTargetRef:
    - parameter: tenantId
      name: kedaloganalytics
      key: tenantId
    - parameter: clientId
      name: kedaloganalytics
      key: clientId
    - parameter: clientSecret
      name: kedaloganalytics
      key: clientSecret
    - parameter: workspaceId
      name: kedaloganalytics
      key: workspaceId
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kedaloganalytics-consumer-scaled-object
  namespace: kedaloganalytics
  labels:
    deploymentName: kedaloganalytics-consumer
spec:
  scaleTargetRef:
    kind: #Optional: Default: Deployment, Available Options: ReplicaSet, Deployment, DaemonSet, StatefulSet
    name: kedaloganalytics-consumer
  pollingInterval: 30
  cooldownPeriod: 30
  minReplicaCount: 1
  maxReplicaCount: 10
  triggers:
  - type: azure-log-analytics
    metadata:
      query: |
        let AppName = "web";
        let ClusterName = "demo-cluster";
        let AvgDuration = ago(10m);
        let ThresholdCoefficient = 0.8;
        Perf
        | where InstanceName contains AppName
        | where InstanceName contains ClusterName
        | where CounterName == "cpuUsageNanoCores"
        | where TimeGenerated > AvgDuration
        | extend AppName = substring(InstanceName, indexof((InstanceName), "/", 0, -1, 10) + 1)
        | summarize MetricValue=round(avg(CounterValue)) by CounterName, AppName
        | join (Perf
                | where InstanceName contains AppName
                | where InstanceName contains ClusterName
                | where CounterName == "cpuLimitNanoCores"
                | where TimeGenerated > AvgDuration
                | extend AppName = substring(InstanceName, indexof((InstanceName), "/", 0, -1, 10) + 1)
                | summarize arg_max(TimeGenerated, *) by AppName, CounterName
                | project Limit = CounterValue, TimeGenerated, CounterPath, AppName)
                on AppName
        | project MetricValue, Threshold = Limit * ThresholdCoefficient
      threshold: "1900000000"
    authenticationRef:
      name: trigger-auth-kedaloganalytics
```

#### Managed identity based authentication

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: trigger-auth-kedaloganalytics
  namespace: kedaloganalytics
spec:
  podIdentity:
    provider: azure-workload
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kedaloganalytics-consumer-scaled-object
  namespace: kedaloganalytics
  labels:
    deploymentName: kedaloganalytics-consumer
spec:
  scaleTargetRef:
    kind: #Optional: Default: Deployment, Available Options: ReplicaSet, Deployment, DaemonSet, StatefulSet
    name: kedaloganalytics-consumer
  pollingInterval: 30
  cooldownPeriod: 30
  minReplicaCount: 1
  maxReplicaCount: 10
  triggers:
  - type: azure-log-analytics
    metadata:
      workspaceId: "81963c40-af2e-47cd-8e72-3002e08aa2af"
      query: |
        let AppName = "web";
        let ClusterName = "demo-cluster";
        let AvgDuration = ago(10m);
        let ThresholdCoefficient = 0.8;
        Perf
        | where InstanceName contains AppName
        | where InstanceName contains ClusterName
        | where CounterName == "cpuUsageNanoCores"
        | where TimeGenerated > AvgDuration
        | extend AppName = substring(InstanceName, indexof((InstanceName), "/", 0, -1, 10) + 1)
        | summarize MetricValue=round(avg(CounterValue)) by CounterName, AppName
        | join (Perf
                | where InstanceName contains AppName
                | where InstanceName contains ClusterName
                | where CounterName == "cpuLimitNanoCores"
                | where TimeGenerated > AvgDuration
                | extend AppName = substring(InstanceName, indexof((InstanceName), "/", 0, -1, 10) + 1)
                | summarize arg_max(TimeGenerated, *) by AppName, CounterName
                | project Limit = CounterValue, TimeGenerated, CounterPath, AppName)
                on AppName
        | project MetricValue, Threshold = Limit * ThresholdCoefficient
      threshold: "1900000000"
    authenticationRef:
      name: trigger-auth-kedaloganalytics
```

### Guides

### Links

- [Use managed identities in Azure Kubernetes Service](https://docs.microsoft.com/en-us/azure/aks/use-managed-identity)
- [Azure Pod Identity on keda.sh](https://keda.sh/docs/2.0/concepts/authentication/#azure-pod-identity)
- [Best practices for authentication and authorization in Azure Kubernetes Service (AKS)](https://docs.microsoft.com/en-us/azure/aks/operator-best-practices-identity)

