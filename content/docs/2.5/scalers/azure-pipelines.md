+++
title = "Azure Pipelines"
availability = "v2.3+"
maintainer = "Community"
description = "Scale applications based on agent pool queues for Azure Pipelines."
go_file = "azure_pipelines_scaler"
+++

### Trigger Specification

This specification describes the `azure-pipelines` trigger for Azure Pipelines. It scales based on the amount of pipeline runs pending in a given agent pool.

```yaml
triggers:
  - type: azure-pipelines
    metadata:
      # Required - Learn more in 'How to determine your pool ID'
      poolID: "{agentPoolId}"
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
- `organizationURLFromEnv` - Name of the environment variable your deployment uses to get the URL for your Azure DevOps organization.
- `personalAccessTokenFromEnv` - Name of the environment variable that provides the personal access token (PAT) for Azure DevOps. Learn more about how to create one [in the official docs](https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops&tabs=preview-page).
- `targetPipelinesQueueLength` - Target value for the amount of pending jobs in the queue to scale on. (Default: `1`, Optional)
  - Example - If one pod can handle 10 jobs, set the queue length target to 10. If the actual number of jobs in the queue is 30, the scaler scales to 3 pods.

### Authentication Parameters

As an alternative to using environment variables, you can authenticate with Azure Devops using a Personal Access Token via `TriggerAuthentication` configuration.

**Personal Access Token Authentication:**

- `organizationURL` - The URL of the Azure DevOps organization.
- `personalAccessToken` - The Personal Access Token (PAT) for Azure DevOps.

### How to determine your pool ID

There are several ways to get the `poolID`. The easiest could be using `az cli` to get it using the command `az pipelines pool list --pool-name {agentPoolName} --organization {organizationURL} --query [0].id`.

It is also possible to get the pool ID using the UI by browsing to the agent pool from the organization (Organization settings -> Agent pools -> `{agentPoolName}`) and getting it from the URL.
The URL should be similar to `https://dev.azure.com/{organization}/_settings/agentpools?poolId={poolID}&view=jobs`

> Careful - You should determine this on an organization-level, not project-level. Otherwise, you might get an incorrect id.

Finally, it is also possible get the pool ID from the response of a HTTP request by calling the `https://dev.azure.com/{organizationName}/_apis/distributedtask/pools?poolname={agentPoolName}` endpoint in the key `value[0].id`.

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
