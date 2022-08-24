+++
title = "Azure Monitor"
availability = "v1.3+"
maintainer = "Microsoft"
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

- `resourceURI` - Shortened URI to the Azure resource. The format is `"<resourceProviderNamespace>/<resourceType>/<resourceName>"`.
- `tenantId` - Tenant id for the Azure resource. Used for authentication.
- `subscriptionId` - Subscription id for the Azure resource. Used for determining the full resource URI.
- `resourceGroupName` - Resource group for the Azure resource.
- `metricName` - Name of the Azure Monitor metric. Must be an officially supported metric found in the [official documentation](https://docs.microsoft.com/en-us/azure/azure-monitor/platform/metrics-supported).
- `metricFilter` - Filter to define a more specific part of the resource. You can filter by supported dimensions of the metric found in the [official documentation](https://docs.microsoft.com/en-us/azure/azure-monitor/platform/metrics-supported). (Optional)
- `metricAggregationInterval` - Aggregation interval of the metric. Reported in the format `"mm:hh:ss"`. (Default: `"0:5:0"`, Optional)
- `metricAggregationType` - Aggregation method of the Azure monitor metric. Some possible values include `Average`, `Total`, `Maximum` with a full list in the [official documentation](https://docs.microsoft.com/en-us/azure/azure-monitor/platform/metrics-supported). No default.
- `targetValue` - Target value for the Azure metric to use in the HPA.
- `activeDirectoryClientId` - Name of the environment variable that contains the active directory client id. Should have the RBAC role of `Monitoring Reader`.
- `activeDirectoryClientPassword` - Name of the environment variable that contains the active directory client password. Should have the RBAC role of `Monitoring Reader`.

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
