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
    activeDirectoryClientId: <client id value> # Optional, can use TriggerAuthentication as well
    activeDirectoryClientIdFromEnv: CLIENT_ID_ENV_NAME # Optional, can use TriggerAuthentication as well
    activeDirectoryClientPasswordFromEnv: CLIENT_PASSWORD_ENV_NAME # Optional, can use TriggerAuthentication as well
```

**Parameter list:**

- `resourceURI` - Shortened URI to the Azure resource with format `"<resourceProviderNamespace>/<resourceType>/<resourceName>"`.
- `tenantId` - Id of the tenant that contains the Azure resource. This is used for authentication.
- `subscriptionId` - Id of Azure subscription that contains the Azure resource. This is used for determining the full resource URI.
- `resourceGroupName` - Name of the resource group for the Azure resource.
- `metricName` - Name of the metric which can be found in the [official documentation](https://docs.microsoft.com/en-us/azure/azure-monitor/platform/metrics-supported).
- `targetValue` - Target value to trigger scaling actions.
- `metricAggregationType` - Aggregation method of the Azure Monitor metric. Optionsinclude `Average`, `Total`, `Maximum` with a full list in the [official documentation](https://docs.microsoft.com/en-us/azure/azure-monitor/platform/metrics-supported).
- `metricFilter` - Name of the filter to be more specific by using dimensions listed in the [official documentation](https://docs.microsoft.com/en-us/azure/azure-monitor/platform/metrics-supported). (optional)
- `metricAggregationInterval` - Collection time of the metric in format `"mm:hh:ss"` (default: `"0:5:0"` which is 5 minutes)
- `activeDirectoryClientId` - Id of the Active Directory application which requires at least `Monitoring Reader` permissions. Optional. Required when `TriggerAuthentication` is not provided.
- `activeDirectoryClientPasswordFromEnv` - Name of the environment variable that contains the active directory client password.Optional. Required when `TriggerAuthentication` is not provided.

Some parameters could be provided using environmental variables, instead of setting them directly in metadata. Here is a list of parameters you can use to retrieve values from environment variables:

- `activeDirectoryClientIdFromEnv` - Id of the Active Directory application which requires at least `Monitoring Reader` permissions, similar to `activeDirectoryClientId`, but reads it from an environment variable on the scale target. Optional. Required when `TriggerAuthentication` is not provided.

### Authentication Parameters

You can use `TriggerAuthentication` CRD to configure the authentication by providing a set of Azure Active Directory credentials or by using pod identity.

**Credential based authentication:**

- `activeDirectoryClientId` - Id of the Active Directory application which requires at least `Monitoring Reader` permissions
- `activeDirectoryClientPassword` - Password of the Active Directory application

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
apiVersion: keda.sh/v1alpha1
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
  # or Pod Identity, kind: Secret is not required in case of pod Identity
  podIdentity:
      provider: azure
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: azure-monitor-scaler
spec:
  scaleTargetRef:
    name: azure-monitor-example
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
