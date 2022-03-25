+++
title = "Azure Application Insights"
layout = "scaler"
availability = "v2.6+"
maintainer = "Community"
description = "Scale applications based on Azure Application Insights metrics."
go_file = "azure_app_insights_scaler"
+++

### Trigger Specification

This specification describes the `azure-app-insights` trigger that scales based on an Azure Application Insights metric.

```yaml
triggers:
- type: azure-app-insights
  metadata:
    metricAggregationTimespan: "0:1"
    metricAggregationType: avg
    metricFilter: cloud/roleName eq 'role_name'
    metricId: "customMetrics/example-metric"
    targetValue: "1"
    activeDirectoryClientIdFromEnv: CLIENT_ID_ENV_NAME # Optional, can use TriggerAuthentication as well
    activeDirectoryClientPasswordFromEnv: CLIENT_PASSWORD_ENV_NAME # Optional, can use TriggerAuthentication as well
    applicationInsightsIdFromEnv: APP_ID # Optional, can use TriggerAuthentication as well
    tenantIdFromEnv: TENANT_ID` # Optional, can use TriggerAuthentication as well
    # Optional (Default: AzurePublicCloud)
    cloud: private
    # Required when cloud = Private
    appInsightsResourceURL: https://api.applicationinsights.airgap.io/
    # Required when cloud = Private.
    activeDirectoryEndpoint: https://login.airgap.example/
```

This scaler is backed by the Azure Application Instance REST API. Please see [this](https://docs.microsoft.com/en-us/rest/api/application-insights/metrics/get) page
for further details.

**Parameter list:**

- `tenantId` - Id of the tenant that contains the Azure resource. This is used for authentication.
- `metricId` - The name of the Application Insights metric to query. Use the [Azure Command Line Interface](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) to run `az monitor app-insights metrics get-metadata` to see a list of available metrics.
- `targetValue` - Target value to trigger scaling actions.
- `metricAggregationType` - Aggregation method of the Azure Application Insights metric. The aggregation methods vary from metric to metric. The `az monitor app-insights metrics get-metadata` command can be used to determine which methods apply to a given metric. (Some common aggregation methods are `avg`, `count`, `sum`, `min`, and `max`)
- `metricAggregationInterval` - Collection time of the metric in format `"hh:mm"`.
- `applicationInsightsId` - Id of the Application Insights instance to query. This is a GUID that can be retrieved from the Application Insight's `API Access` blade in the Azure Portal.
- `activeDirectoryClientId` - Id of the Active Directory client. The client must have `Monitoring Reader` permissions for the Application Insights instance.
- `activeDirectoryClientPassword` - Password of the Active Directory client password.
- `metricFilter` - Further specify the metrics query using a filter. For example `cloud/roleName eq 'example`. (Optional)
- `cloud` - Name of the cloud environment that the Event Hub belongs to. (Values: `AzurePublicCloud`, `AzureUSGovernmentCloud`, `AzureChinaCloud`, `Private`, Default: `AzurePublicCloud`, Optional)
- `appInsightsResourceURL` - Application Insights REST API url of the cloud environment. (Required when `cloud` is set to `private`, e.g. `https://login.chinacloudapi.cn/` for `AzureChinaCloud`).
- `activeDirectoryEndpoint` - Active Directory endpoint of the cloud environment. (Required when `cloud` is set to `private`, e.g. `https://login.chinacloudapi.cn/` for `AzureChinaCloud`).

Some parameters can be provided using environment variables, instead of setting them directly in metadata. Here is a list of parameters you can use to retrieve values from environment variables:

- `activeDirectoryClientIdFromEnv` - Name of the environment variable that contains the Id of the Active Directory application. (Optional)
- `activeDirectoryClientPasswordFromEnv` - Name of the environment variable that contains the Active Directory client password. (Optional)
- `applicationInsightsIdFromEnv` - Name of the environment variable that contains the Application Insights Id. (Optional)
- `tenantIdFromEnv` - Name of the environment variable that contains the Id of the tenant that contains the Application Insights instance. (Optional)

### Authentication Parameters

You can use the `TriggerAuthentication` CRD to configure the authentication by providing a set of Azure Active Directory credentials or by using pod identity.

**Credential based authentication:**

- `activeDirectoryClientId` - Id of the Active Directory application which requires at least `Monitoring Reader` permissions.
- `activeDirectoryClientPassword` - Password of the Active Directory application.
- `applicationInsightsId` - Id of the Application Insights instance to query.
- `tenantId` - Id of the tenant that contains the Azure resource.

The principal will need `Monitoring Reader` access to query metrics from the Application Insights instance.

**Pod identity based authentication:**

[Azure Active Directory pod-managed identity](https://docs.microsoft.com/en-us/azure/aks/use-azure-ad-pod-identity) can be used
in place of credential based authentication. The following section contains an example of a `TriggerAuthentication` using pod identity.

### Example

The following example illustrates the use of a TriggerAuthentication to connect to Application Insights.
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: azure-app-insights-secrets
data:
  activeDirectoryClientId: <clientId>
  activeDirectoryClientPassword: <clientPassword>
  applicationInsightsId: <appInsightsAppId>
  tenantId: <tenantId>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: azure-app-insights-trigger-auth
spec:
  secretTargetRef:
    - parameter: activeDirectoryClientId
      name: azure-app-insights-secrets
      key: activeDirectoryClientId
    - parameter: activeDirectoryClientPassword
      name: azure-app-insights-secrets
      key: activeDirectoryClientPassword
    - parameter: applicationInsightsId
      name: azure-app-insights-secrets
      key: applicationInsightsId
    - parameter: tenantId
      name: azure-app-insights-secrets
      key: tenantId
  # or Pod Identity, kind: Secret is not required in case of pod Identity
  podIdentity:
      provider: azure
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: azure-app-insights-scaler
spec:
  scaleTargetRef:
    name: azure-app-insights-example
  minReplicaCount: 1
  maxReplicaCount: 10
  triggers:
  - type: azure-app-insights
    metadata:
      metricId: "customMetrics/example-metric"
      metricAggregationTimespan: "0:5"
      metricAggregationType: avg
      metricFilter: cloud/roleName eq 'example'
      targetValue: "1"
    authenticationRef:
      name: azure-app-insights-trigger-auth
```

The following example illustrates the use of environment variables to connect to Application Insights.
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: azure-app-insights-secrets
type: Opaque
data:
  activeDirectoryClientId: <clientId>
  activeDirectoryClientPassword: <clientPassword>
  applicationInsightsId: <appInsightsAppId>
  tenantId: <tenantId>
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: azure-app-insights-example
spec:
  replicas: 0
  selector:
    matchLabels:
      app: azure-app-insights-example
  template:
    metadata:
      labels:
        app: azure-app-insights-example
    spec:
      containers:
      - name: example
        image: nginx:1.16.1
        env:
        - name: ACTIVE_DIRECTORY_ID
          valueFrom:
            secretKeyRef:
              name: azure-app-insights-secrets
              key: activeDirectoryClientId
        - name: ACTIVE_DIRECTORY_PASSWORD
          valueFrom:
            secretKeyRef:
              name: azure-app-insights-secrets
              key: activeDirectoryClientPassword
        - name: APP_INSIGHTS_APP_ID
          valueFrom:
            secretKeyRef:
              name: azure-app-insights-secrets
              key: applicationInsightsId
        - name: TENANT_ID
          valueFrom:
            secretKeyRef:
              name: azure-app-insights-secrets
              key: tenantId
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: azure-app-insights-scaler
spec:
  scaleTargetRef:
    name: azure-app-insights-example
  pollingInterval: 5
  cooldownPeriod: 5
  minReplicaCount: 0
  maxReplicaCount: 2
  triggers:
    - type: azure-app-insights
      metadata:
        metricId: "customMetrics/example-metric"
        metricAggregationTimespan: "0:5"
        metricAggregationType: avg
        metricFilter: cloud/roleName eq 'example'
        targetValue: "1"
        activeDirectoryClientIdFromEnv: ACTIVE_DIRECTORY_ID
        activeDirectoryClientPasswordFromEnv: ACTIVE_DIRECTORY_PASSWORD
        applicationInsightsIdFromEnv: APP_INSIGHTS_APP_ID
        tenantIdFromEnv: TENANT_ID
```
