+++
title = "Azure Log Analytics"
layout = "scaler"
availability = "v2.0+"
maintainer = "Community"
description = "Scale applications based on Azure Log Analytics query result"
go_file = "azure_log_analytics_scaler"
+++

### Trigger Specification

This specification describes the `azure-log-analytics` trigger for Azure Log Analytics query result. Here is an example of providing values in metadata:

```yaml
triggers:
  - type: azure-log-analytics
    metadata:
      tenantId: "72f988bf-86f1-41af-91ab-2d7cd011db47"
      tenantIdFromEnv: TENANT_ID_ENV_NAME # Optional. You can use this instead of `tenantId` parameter. See details in "Parameter list" section
      clientId: "04b4ca0a-82b1-4c0a-bbbb-7946442e805b"
      clientIdFromEnv: CLIENT_ID_ENV_NAME # Optional. You can use this instead of `clientId` parameter. See details in "Parameter list" section
      clientSecret: "vU6UtUXls6RNXxv~l6NRi1V8J1fnk5Q-ce"
      clientSecretFromEnv: CLIENT_SECRET_ENV_NAME # Optional. You can use this instead of `clientSecret` parameter. See details in "Parameter list" section
      workspaceId: "81963c40-af2e-47cd-8e72-3002e08aa2af"
      workspaceIdFromEnv: WORKSPACE_ID_ENV_NAME # Optional. You can use this instead of `workspaceId` parameter. See details in "Parameter list" section
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
```

**Parameter list:**

- `tenantId`: Azure Active Directory tenant id. Follow [this](https://docs.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest#az-account-show) link to retrieve your tenant id.
- `clientId`: Application id from your Azure AD Application/service principal. Follow [this](https://docs.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest) link to create your service principal.
- `clientSecret`: Password from your Azure AD Application/service principal.
- `workspaceId`: Your Log Analytics workspace id. Follow [this](https://docs.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace?view=azure-cli-latest#az-monitor-log-analytics-workspace-list) link to get your Log Analytics workspace id.
- `query`: Log Analytics [kusto](https://docs.microsoft.com/en-us/azure/azure-monitor/log-query/get-started-queries) query, JSON escaped. You can use [this](https://www.freeformatter.com/json-escape.html) tool to convert your query from Log Analytics query editor to JSON escaped string, and then review YAML specific escapes.
- `threshold`: An int64 value will be used as a threshold to calculate # of pods for scale target.

The authentication parameters could be provided using environmental variables, instead of setting them directly in metadata. Here is a list of parameters you can use to retrieve values from environment variables:

- `tenantIdFromEnv` optional: An environmental variable name, that stores Azure Active Directory tenant id. Follow [this](https://docs.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest#az-account-show) link to retrieve your tenant id.
- `clientIdFromEnv` optional: An environmental variable name, that stores Application id from your Azure AD Application/service principal. Follow [this](https://docs.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest) link to create your service principal.
- `clientSecretFromEnv` optional: An environmental variable name, that stores password from your Azure AD Application/service principal.
- `workspaceIdFromEnv` optional: An environmental variable name, that stores your Log Analytics workspace id. Follow [this](https://docs.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace?view=azure-cli-latest#az-monitor-log-analytics-workspace-list) link to get your Log Analytics workspace id.

### Query Guidance

It is important to design your query to return 1 table with 1 row. A good practice is to add "| limit 1" at the end of your query.

Scaler will take value from:

- 1st cell as Metrics Value.
- 2d cell as Threshold (optional).

You can define threshold in trigger metadata, it will be used if your query results only 1 cell, that will be interpreted as metric value. Be aware, even if you have defined threshold in metadata, it can be overwritten by your query.

A data types of your query result should be: real, int or long. Other data types are not supported. Later, during runtime, your data will be converted to int64.

Be careful with setting up "pollingInterval" and long running queries. Test your query before.

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

You can convert your query in JSON escaped string using [this](https://www.freeformatter.com/json-escape.html) tool and check yaml specific escapes.

Example result:

![Azure Log Analytics query example](/img/azure-log-analytics-scaler-query-example.png)

### Scaler Limitations

- As Log Analytics Scaler using Service Principal to authorize REST API requests, you should be aware of throttling. You should take to account the following Azure AD limit: 200 requests per 30 seconds. Each Log Analytics Scaler request's Access Token twice per pooling interval (one by Keda Operator and one by Keda Metrics Server). So, theoretical maximum number of Log Analytics scalers, created with the same Service Principal for 30sec pooling interval can be 100. Read more about throttling: [here](https://dev.applicationinsights.io/documentation/Authorization/Rate-limits), [here](https://docs.microsoft.com/en-us/previous-versions/azure/ad/graph/howto/azure-ad-graph-api-throttling#what-is-throttling) and [here](https://docs.microsoft.com/en-us/azure/active-directory/users-groups-roles/directory-service-limits-restrictions)
- As it was mentioned before, you can define a threshold using query (2d cell of query result will be interpret as threshold). Be aware! Threshold from query result will be set only once, during scaler creation. So, if your query will return different threshold values during runtime, they will not be propagated to Horizontal Pod Autoscaler target.
  
### Authentication Parameters

 You can use `TriggerAuthentication` CRD to configure the authentication by providing a set of Azure Active Directory credentials and resource identifiers.

**Service Principal based authentication:**

- `tenantId`: Azure Active Directory tenant id. Follow [this](https://docs.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest#az-account-show) link to retrieve your tenant id.
- `clientId`: Application id from your Azure AD Application/service principal. Follow [this](https://docs.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest) link to create your service principal.
- `clientSecret`: Password from your Azure AD Application/service principal.
- `workspaceId`: Your Log Analytics workspace id. Follow [this](https://docs.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace?view=azure-cli-latest#az-monitor-log-analytics-workspace-list) link to get your Log Analytics workspace id.

### Example

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
  tenantId: "72f988bf-86f1-41af-91ab-2d7cd011db47"
  clientId: "04b4ca0a-82b1-4c0a-bbbb-7946442e805b"
  clientSecret: "vU6UtUXls6RNXxv~l6NRi1V8J1fnk5Q-ce"
  workspaceId: "81963c40-af2e-47cd-8e72-3002e08aa2af"
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
    authenticationRef:
      name: trigger-auth-kedaloganalytics
