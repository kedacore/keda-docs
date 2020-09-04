+++
title = "Azure Log Analytics"
layout = "scaler"
availability = "v2.0+"
maintainer = "Community"
description = "Scale applications based on Azure Log Analytics query result"
go_file = "azure_log_analytics_scaler"
+++

### Trigger Specification

This specification describes the `azure-log-analytics` trigger for Azure Log Analytics query result.

```yaml
triggers:
  - type: azure-log-analytics
    metadata:
      tenantID: "72f988bf-86f1-41af-91ab-2d7cd011db47"
      clientID: "04b4ca0a-82b1-4c0a-bbbb-7946442e805b"
      clientSecret: "vU6UtUXls6RNXxv~l6NRi1V8J1fnk5Q-ce"
      workspaceID: "81963c40-af2e-47cd-8e72-3002e08aa2af"
      query: "let AppName = \"web\";\r\nlet ClusterName = \"demo-cluster\";\r\nlet AvgDuration = ago(10m);\r\nlet ThresholdCoefficient = 0.8;\r\nPerf\r\n| where InstanceName contains AppName\r\n| where InstanceName contains ClusterName\r\n| where CounterName == \"cpuUsageNanoCores\"\r\n| where TimeGenerated > AvgDuration\r\n| extend AppName = substring(InstanceName, indexof((InstanceName), \"/\", 0, -1, 10) + 1)\r\n| summarize MetricValue=round(avg(CounterValue)) by CounterName, AppName\r\n| join (Perf \r\n        | where InstanceName contains AppName\r\n        | where InstanceName contains ClusterName\r\n        | where CounterName == \"cpuLimitNanoCores\"\r\n        | where TimeGenerated > AvgDuration\r\n        | extend AppName = substring(InstanceName, indexof((InstanceName), \"/\", 0, -1, 10) + 1)\r\n        | summarize arg_max(TimeGenerated, *) by AppName, CounterName\r\n        | project Limit = CounterValue, TimeGenerated, CounterPath, AppName)\r\n        on AppName\r\n| project MetricValue, Threshold = Limit * ThresholdCoefficient"
      threshold: "1900000000"
```

**Parameter list:**

- `tenantID`: Azure Active Directory tenant id. Follow [this](https://docs.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest#az-account-show) link to retrieve your tenant id.

- `clientID`: Application id from your Azure AD Application/service principal. Follow [this](https://docs.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest) link to create your service principal.

- `clientSecret`: Password from your Azure AD Application/service principal.

- `workspaceID`: Your Log Analytics workspace id. Follow [this](https://docs.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace?view=azure-cli-latest#az-monitor-log-analytics-workspace-list) link to get your Log Analytics workspace id.

- `query`: Log Analytics [kusto](https://docs.microsoft.com/en-us/azure/azure-monitor/log-query/get-started-queries) query, JSON escaped. You can use [this](https://www.freeformatter.com/json-escape.html) tool to convert your query from Log Analytics query editor to JSON escaped string, and then review YAML specific escapes.
- `threshold`: An int64 value will be used as a threshold to calculate # of pods for scale target.

### Query Guidance

It is important to design your query to return 1 table with 1 row. A good practice is to add "| limit 1" at the end of your query.
Scaler will take value from:

- 1st cell as Metrics Value.
- 2d cell as Threshold (optional).

You can define threshold in trigger metadata, it will be used if your query results only 1 cell, that will be interpreted as metric value. Be aware, even if you have defined threshold in metadata, it can be overwritten by your query.

A data types of your query result should be: real, int or long. Other data types are not supported. Later, during runtime, your data will be converted to int64.

Be careful with setting up "pollingInterval" and long running queries. Test your query before.

Example query to get MetricValue and Threshold based on CPU usage and Limits, defined for the pod.
```
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

**Scaler limitations (READ CAREFULLY):**

- As Log Analytics Scaler using Service Principal to authorize REST API requests, you should be aware of throttling. You should take to account the following AAD limit: 200 requests per 30 seconds. Each Log Analytics Scaler request's Access Token twice per pooling interval (one by Keda Operator and one by Keda Metrics Server). So, theoretical maximum number of Log Analytics scalers, created with the same Service Principal for 30sec pooling interval can be 100. Read more about throttling: [here](https://dev.applicationinsights.io/documentation/Authorization/Rate-limits), [here](https://docs.microsoft.com/en-us/previous-versions/azure/ad/graph/howto/azure-ad-graph-api-throttling#what-is-throttling) and [here](https://docs.microsoft.com/en-us/azure/active-directory/users-groups-roles/directory-service-limits-restrictions)
- As it was mentioned before, you can define a threshold using query (2d cell of query result will be interpret as threshold). Be aware! Threshold from query result will be set only once, during scaler creation. So, if your query will return different threshold values during runtime, they will not be propagated to HPA target.
  
### Authentication Parameters

 You can use `TriggerAuthentication` CRD to configure the `tenantID`, `clientID`, `clientSecret` and `workspaceID` to connect to Log Analytics API.

**Service Principal based authentication:**

- `tenantID` required: Azure Active Directory TenantId. Follow [this](https://docs.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest#az-account-show) link to retrieve your TenantId.
- `clientID` required: appId from your Service Principal. Follow [this](https://docs.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest) link to create your Service Principal.
- `clientSecret` required: password from your Service Principal.
- `workspaceID` required: Your Log Analytics WorkspaceId. Follow [this](https://docs.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace?view=azure-cli-latest#az-monitor-log-analytics-workspace-list) link to get your Log Analytics WorkspaceId.

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
  tenantID: "72f988bf-86f1-41af-91ab-2d7cd011db47"
  clientID: "04b4ca0a-82b1-4c0a-bbbb-7946442e805b"
  clientSecret: "vU6UtUXls6RNXxv~l6NRi1V8J1fnk5Q-ce"
  workspaceID: "81963c40-af2e-47cd-8e72-3002e08aa2af"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: trigger-auth-kedaloganalytics
  namespace: kedaloganalytics
spec:
  secretTargetRef:
    - parameter: tenantID
      name: kedaloganalytics
      key: tenantID
    - parameter: clientID
      name: kedaloganalytics
      key: clientID
    - parameter: clientSecret
      name: kedaloganalytics
      key: clientSecret
    - parameter: workspaceID
      name: kedaloganalytics
      key: workspaceID
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
      query: "let AppName = \"web\";\r\nlet ClusterName = \"demo-cluster\";\r\nlet AvgDuration = ago(10m);\r\nlet ThresholdCoefficient = 0.8;\r\nPerf\r\n| where InstanceName contains AppName\r\n| where InstanceName contains ClusterName\r\n| where CounterName == \"cpuUsageNanoCores\"\r\n| where TimeGenerated > AvgDuration\r\n| extend AppName = substring(InstanceName, indexof((InstanceName), \"/\", 0, -1, 10) + 1)\r\n| summarize MetricValue=round(avg(CounterValue)) by CounterName, AppName\r\n| join (Perf \r\n        | where InstanceName contains AppName\r\n        | where InstanceName contains ClusterName\r\n        | where CounterName == \"cpuLimitNanoCores\"\r\n        | where TimeGenerated > AvgDuration\r\n        | extend AppName = substring(InstanceName, indexof((InstanceName), \"/\", 0, -1, 10) + 1)\r\n        | summarize arg_max(TimeGenerated, *) by AppName, CounterName\r\n        | project Limit = CounterValue, TimeGenerated, CounterPath, AppName)\r\n        on AppName\r\n| project MetricValue, Threshold = Limit * ThresholdCoefficient"
      threshold: "1900000000"
    authenticationRef:
      name: trigger-auth-kedaloganalytics
