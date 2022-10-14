+++
title = "Azure Pipelines"
availability = "v2.3+"
maintainer = "Microsoft"
description = "Scale applications based on agent pool queues for Azure Pipelines."
go_file = "azure_pipelines_scaler"
+++

### Trigger Specification

This specification describes the `azure-pipelines` trigger for Azure Pipelines. It scales based on the amount of pipeline runs pending in a given agent pool.

```yaml
triggers:
  - type: azure-pipelines
    metadata:
      # Optional: Name of the pool in Azure DevOps
      poolName: "{agentPoolName}"
      # Optional: Learn more in 'How to determine your pool ID'
      poolID: "{agentPoolId}"
      # Optional: Azure DevOps organization URL, can use TriggerAuthentication as well
      organizationURLFromEnv: "AZP_URL"
      # Optional: Azure DevOps Personal Access Token, can use TriggerAuthentication as well
      personalAccessTokenFromEnv: "AZP_TOKEN"
      # Optional: Target queue length
      targetPipelinesQueueLength: "1" # Default 1
      activationTargetPipelinesQueueLength: "5" # Default 0
      # Optional: Parent template to read demands from
      parent: "{parent ADO agent name}"
      # Optional: Demands string to read demands from ScaledObject
      demands: "{demands}"
    authenticationRef:
     name: pipeline-trigger-auth
```

**Parameter list:**

- `poolName` - Name of the pool. (Optional, either `poolID` or `poolName` must be configured)
- `poolID` - Id of the pool. (Optional, either `poolID` or `poolName` must be configured)
- `organizationURLFromEnv` - Name of the environment variable your deployment uses to get the URL for your Azure DevOps organization.
- `personalAccessTokenFromEnv` - Name of the environment variable that provides the personal access token (PAT) for Azure DevOps. Learn more about how to create one [in the official docs](https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops&tabs=preview-page).
- `targetPipelinesQueueLength` - Target value for the amount of pending jobs in the queue to scale on. (Default: `1`, Optional)
  - Example - If one pod can handle 10 jobs, set the queue length target to 10. If the actual number of jobs in the queue is 30, the scaler scales to 3 pods.
- `activationTargetPipelinesQueueLength` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional)
- `parent` - Put the name of the ADO agent that matched the ScaledObject. e.g. mavenagent-scaledobject may have an initial deployment called "mavenagent-keda-template"; this is the deployment that is made offline. This name is provided to the initial deployment as the environment variable "AZP_NAME"
- `demands` - Put the demands string that was provided to the ScaledObject. This MUST be a subset of the actual capability list the agent has. e.g. `maven,docker`

> 💡 **NOTE:** You can either use `poolID` or `poolName`. If both are specified, then `poolName` will be used.

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

### Supporting demands in agents

By default, if you do not wish to use demands in your agent scaler then it will scale based simply on the pool's queue length.

Demands (Capabilities) are useful when you have multiple agents with different capabilities existing within the same pool,
for instance in a kube cluster you may have an agent supporting dotnet5, dotnet6, java or maven;
particularly these would be exclusive agents where jobs would fail if run on the wrong agent. This is Microsoft's demands feature.

- **Using Parent:** Azure DevOps is able to determine which agents can match any job it is waiting for. If you specify a parent template then KEDA will further interrogate the job request to determine if the parent is able to fulfill the job. If the parent is able to complete the job it scales the workload fulfill the request. The parent template that is generally offline must stay in the Pool's Agent list.

- **Using demands:** KEDA will determine which agents can fulfill the job based on the demands provided. The demands are provided as a comma-separated list and must be a subset of the actual capabilities of the agent. (For example `maven,java,make`. Note: `Agent.Version` is ignored)

Microsoft's documentation: [https://learn.microsoft.com/en-us/azure/devops/pipelines/process/demands?view=azure-devops&tabs=yaml](https://learn.microsoft.com/en-us/azure/devops/pipelines/process/demands?view=azure-devops&tabs=yaml)

Please note that the parent template feature is exclusive to KEDA and not Microsoft and is another way of supporting demands.

If you wish to use demands in your agent scaler then you can do so by adding the following to your pipeline:

```yaml
    pool:
      - name: "{agentPoolName}"
        demands: 
          - example-demands
          - another-demand -equals /bin/executable
```

Then, you can use the `demands` parameter to specify the demands that your agent supports or the `parent` parameter to link a template that matches you scaled object.

KEDA will use the following evaluation order:
1) If neither parent nor demands are defined in the scaling definition, it will scale the workload to fulfill the job.
2) If `parent` is set,  KEDA will interrogate the job request to determine if the parent is able to fulfill the job. If the parent is able to complete the job it scales the workload to fulfill the request.
3) Finally, if the demands are set in the scaling definition then KEDA will determine which agents can fulfill the job based on the demands provided.

> Note: If more than one scaling definition is able to fulfill the demands of the job then they will both spin up an agent.

#### How it works under the hood

Azure DevOps has a Job Request API with returns a list of all jobs, and the agent that they are assigned to, or could potentially be assigned to. This is an undocumented Microsoft API which is available on `https://dev.azure.com/<organisation>/_apis/distributedtask/pools/<poolid>/jobrequests`.

KEDA will interpret this request to find any matching template from the defined parent in the scaling definition, or any agent that can satisfy the demands specified in the scaling definition.

Once it finds it, it will scale the workload that matched the definition and Azure DevOps will assign it to that agent.

### Configuring the agent container

Microsoft self-hosted docker agent documentation: https://docs.microsoft.com/en-us/azure/devops/pipelines/agents/docker?view=azure-devops#linux

Please use the script in Step 5 as the entrypoint for your agent container.

You will need to change this section of the shell script so that the agent will terminate and cleanup itself when the job is complete by using the `--once` switch.
The if statement for cleanup is only required if you are using the auto-deployment parent template method.

```
print_header "4. Running Azure Pipelines agent..."

trap 'cleanup; exit 0' EXIT
trap 'cleanup; exit 130' INT
trap 'cleanup; exit 143' TERM

chmod +x ./run-docker.sh

# To be aware of TERM and INT signals call run.sh
# Running it with the --once flag at the end will shut down the agent after the build is executed
./run-docker.sh "$@" & wait $!
```

to


```
print_header "4. Running Azure Pipelines agent..."

if ! grep -q "template" <<< "$AZP_AGENT_NAME"; then
  echo "Cleanup Traps Enabled"

  trap 'cleanup; exit 0' EXIT
  trap 'cleanup; exit 130' INT
  trap 'cleanup; exit 143' TERM

fi

chmod +x ./run-docker.sh

# To be aware of TERM and INT signals call run.sh
# Running it with the --once flag at the end will shut down the agent after the build is executed
./run-docker.sh "$@" --once & wait $!
```

### Example for ScaledObject

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
      parent: "example-keda-template"
      demands: "maven,docker"      
    authenticationRef:
     name: pipeline-trigger-auth
```

###Example for Parent Deployment or StatefulSet

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent
spec:
  replicas: 1
  selector:
    matchLabels:
      app: agent
  spec:
    containers:
      - name: agent
        image: [SAME AS SCALED JOB]
        envFrom:
          - secretRef:
              name: ado-pat-tokens
        env:
          - name: AZP_AGENT_NAME
            value: example-keda-template # Matches Scaled Job Parent
          
```
