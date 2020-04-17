+++
title = "Azure Monitor"
layout = "scaler"
availability = "v1.3+"
maintainer = "Community"
description = "Scale applications based on Azure Monitor metrics."
go_file = "azure_monitor_scaler"
+++

### Trigger Specification

This specification describes the `azure-monitor` trigger that scales based on an Azure Monitor metric.

```yaml
triggers:
- type: azure-monitor
  metadata:
    resourceURI: Microsoft.ContainerService/managedClusters/azureMonitorCluster
    tenantId: xxx-xxx-xxx-xxx-xxx
    subscriptionId: yyy-yyy-yyy-yyy-yyy
    resourceGroupName: azureMonitor
    metricName: kube_pod_status_ready
    metricFilter: namespace eq 'default'
    metricAggregationInterval: "0:1:0"
    targetValue: "1"
    activeDirectoryClientId: CLIENT_ID_ENV_NAME
    activeDirectoryClientPassword: CLIENT_PASSWORD_ENV_NAME
```

**Parameter list:**

- `resourceURI` is the shortened URI to the Azure resource. The format is `"<resourceProviderNamespace>/<resourceType>/<resourceName>"`. Required. 
- `tenantId` is the tenant id for the Azure resource. Used for authentication. Required.
- `subscriptionId` is the subscription id for the Azure resource. Used for determining the full resource URI. Required.
- `resourceGroupName` is the resource group for the Azure resource. Required.
- `metricName` is the name of the metric. Must be an officially supported metric  found in the [official documentation](https://docs.microsoft.com/en-us/azure/azure-monitor/platform/metrics-supported). Required.
- `metricFilter` is used to define a more specific part of the resource. You can filter by supported dimensions of the metric found in the [official documentation](https://docs.microsoft.com/en-us/azure/azure-monitor/platform/metrics-supported). Optional.
- `metricAggregationInterval` is the collection time of the metric. Reported in the format `"mm:hh:ss"`. The default value is `"0:5:0"` (5 minutes). Optional.
- `metricAggregationType` is the aggregation method of the Azure monitor metric. Some possible values include `Average`, `Total`, `Maximum` with a full list in the [official documentation](https://docs.microsoft.com/en-us/azure/azure-monitor/platform/metrics-supported). No default. Required.
- `targetValue` is the target value for the Azure metric to use in the HPA. Required.
- `activeDirectoryClientId` is the name of the environment variable that contains the active directory client id. Should have the RBAC role of `Monitoring Reader`. Optional. Required when `TriggerAuthentication` is not provided.
- `activeDirectoryClientPassword` is the name of the environment variable that contains the active directory client password. Should have the RBAC role of `Monitoring Reader`. Optional. Required when `TriggerAuthentication` is not provided.

### Authentication Parameters

You can use `TriggerAuthentication` CRD to configure the authentication by providing a set of Azure Active Directory credentials.

**Credential based authentication:**

- `activeDirectoryClientId` - Active Directory client id.
- `activeDirectoryClientPassword` - Active Directory client password.

The user will need access to read data from the Azure resource.

### Example

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: azure-monitor-secrets
data:
  activeDirectoryClientId: <clientId>
  activeDirectoryClientPassword: <clientPassword>
---
apiVersion: keda.k8s.io/v1alpha1
kind: TriggerAuthentication
metadata: 
  name: azure-monitor-trigger-auth
spec:
  secretTargetRef:
    - parameter: activeDirectoryClientId
      name: azure-monitor-secrets
      key: activeDirectoryClientId
    - parameter: activeDirectoryClientPassword
      name: azure-monitor-secrets
      key: activeDirectoryClientPassword
---
apiVersion: keda.k8s.io/v1alpha1
kind: ScaledObject
metadata:
  name: azure-monitor-scaler
  labels:
    app: azure-monitor-example
spec:
  scaleTargetRef:
    deploymentName: azure-monitor-example
  minReplicaCount: 1
  maxReplicaCount: 10
  triggers:
  - type: azure-monitor
    metadata:
      resourceURI: Microsoft.ContainerService/managedClusters/azureMonitorCluster 
      tenantId: xxx-xxx-xxx-xxx-xxx
      subscriptionId: yyy-yyy-yyy-yyy-yyy
      resourceGroupName: azureMonitor
      metricName: kube_pod_status_ready
      metricFilter: namespace eq 'default'
      metricAggregationInterval: "0:1:0"
      metricAggregationType: Average
      targetValue: "1"
    authenticationRef:
      name: azure-monitor-trigger-auth
```
