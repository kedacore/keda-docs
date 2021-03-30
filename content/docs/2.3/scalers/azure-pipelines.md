+++
title = "Azure Pipelines"
layout = "scaler"
availability = "v2.3+"
maintainer = "Community"
description = "Scale applications based on Azure Pipelines Queues."
go_file = "azure_pipelines_scaler"
+++

### Trigger Specification

This specification describes the `azure-pipelines` trigger for Azure Pipelines Queue. It scales based on the queue length of Azure DevOps jobs in a given Agent Pool.

```yaml
triggers:
  - type: azure-pipelines
    metadata:
      # Required: poolID - Can be retreived by the REST API call https://dev.azure.com/{organizationName}/_apis/distributedtask/pools?poolname={agentPoolName}
      poolID: "1"
      # Optional: Azure DevOps organization URL, can use TriggerAuthentication as well
      organizationURLFromEnv: "AZP_URL"
      # Optional: Azure DevOps Personal Access Token, can use TriggerAuthentication as well
      personalAccessTokenFromEnv: "AZP_TOKEN"
      # Optional: Target queue length
      targetPipelinesQueueLength: "1" # Default 1
    authenticationRef:
     name: pipeline-trigger-auth
```

**Parameter list:**

- `poolID` - Id of the queue.
- `organizationURLFromEnv` - Name of the environment variable your deployment uses to get the organizationURL string.
- `personalAccessTokenFromEnv` - Name of the environment variable your deployment uses to get the personalAccessToken string.
- `targetPipelinesQueueLength` - Target value for queue length passed to the scaler. Example: if one pod can handle 10 jobs, set the queue length target to 10. If the actual number of jobs in the queue is 30, the scaler scales to 3 pods. (default: 1)

### Authentication Parameters

As an alternative to using environment variables, you can authenticate with Azure Devops using a Personal Access Token via `TriggerAuthentication` configuration.

**Personal Access Token Authentication:**

- `organizationURL` - The Azure DevOps organization
- `personalAccessToken` - The Azure DevOps Personal Access Token

### Example

```yaml
apiVersion: v1
kind: Secret
type: Opaque
metadata:
  name: pipeline-auth
data:
  personalAccessToken: <encoded personalAccessToken>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: pipeline-trigger-auth
  namespace: default
spec:
  secretTargetRef:
    - parameter: personalAccessToken
      name: pipeline-auth
      key: personalAccessToken
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: azure-pipelines-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: azdevops-deployment
  minReplicaCount: 1
  maxReplicaCount: 5 
  triggers:
  - type: azure-pipelines
    metadata:
      poolID: "1"
      organizationURLFromEnv: "AZP_URL"
    authenticationRef:
     name: pipeline-trigger-auth
```
