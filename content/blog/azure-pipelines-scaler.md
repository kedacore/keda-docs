+++
title = "Autoscaling Azure Pipelines agents with KEDA"
date = 2021-04-28
author = "Troy Denorme"
+++

With the addition of Azure Piplines support in KEDA, it is now possible to autoscale your Azure Pipelines agents based on an Azure Pipelines agent pool queue.
Self-hosted Azure Pipelines agents are the perfect workload for this scaler. By autoscaling the agents you can create a scalable CI/CD environment.

> The number of concurrent pipelines you can run is limited by your [parallel jobs](https://docs.microsoft.com/en-us/azure/devops/pipelines/agents/agents#parallel-jobs). KEDA will autoscale to the maximum defined in the ScaledObject and does not limit itself to the parallel jobs count defined for the Azure DevOps organization.

## Azure Pipelines agents

You can run your Azure Pipelines jobs on different kinds of agents ([docs](https://docs.microsoft.com/en-us/azure/devops/pipelines/agents/agents)). But if you want full control, you are going to use self-hosted agents. 
The agents can run on Linux, macOS or Windows machines but also in a container. To scale the agents with KEDA you can run self-hosted agents on Kubernetes.

## Deploy a self-hosted agent on Kubernetes

### Create the container image

To create a basic Azure Pipelines agent image you can follow the instructions from the offical docs. [Run a self-hosted agent in Docker](https://docs.microsoft.com/en-us/azure/devops/pipelines/agents/docker#linux).

### Deploy on Kubernetes

You can deploy the agent as a Kubernetes deployment and use KEDA to autoscale the deployment.
The following is an example manifest for the deployment.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: azdevops-deployment
  labels:
    app: azdevops-agent
spec:
  replicas: 1
  selector:
    matchLabels:
      app: azdevops-agent
  template:
    metadata:
      labels:
        app: azdevops-agent
    spec:
      containers:
      - name: azdevops-agent
        image: <azdevops-image>
        env:
          - name: AZP_URL
            valueFrom:
              secretKeyRef:
                name: azdevops
                key: AZP_URL
          - name: AZP_TOKEN
            valueFrom:
              secretKeyRef:
                name: azdevops
                key: AZP_TOKEN
          - name: AZP_POOL
            valueFrom:
              secretKeyRef:
                name: azdevops
                key: AZP_POOL
        volumeMounts:
        - mountPath: /var/run/docker.sock
          name: docker-volume
      volumes:
      - name: docker-volume
        hostPath:
          path: /var/run/docker.sock
```

### Autoscaling with KEDA

After the deployment is created you need to create the ScaledObject in order for KEDA to start scaling the deployment.
To scale based on the queue length of an Azure Pipelines agent pool, you can use the `azure-pipelines` trigger.

```yaml
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

The default `targetPipelinesQueueLength` is `1`, so there is one agent for each job.

> The Azure Pipelines scaler supports scaling to zero but you need at least one agent registered in the agent pool in order for new jobs to be scheduled on the pool.

### Running jobs

After deploying the agent and the KEDA ScaledObject. It is time to see the autoscaling in action.

First, check the current pods running in the deployment:
```sh
$ kubectl get pods
NAME                                   READY   STATUS    RESTARTS   AGE
azdevops-deployment-5854bbbf84-r86qv   1/1     Running   0          75s
```

![deployment agents](/img/blog/azure-pipelines-scaler/deployment-agents.png)

Now let's queue some builds.

![azure devops builds](/img/blog/azure-pipelines-scaler/deployment-builds.png)

```sh
$ kubectl get pods
NAME                                   READY   STATUS    RESTARTS   AGE
azdevops-deployment-5854bbbf84-4gfbx   1/1     Running   0          36s
azdevops-deployment-5854bbbf84-r86qv   1/1     Running   0          12m
azdevops-deployment-5854bbbf84-tm47k   1/1     Running   0          36s
```

![deployment agents](/img/blog/azure-pipelines-scaler/deployment-agents-autoscaled.png)

## Run the self-hosted agent as a Job

When running your agents as a deployment you have no control on which pod gets killed when scaling down. ([see KEDA docs](https://keda.sh/docs/1.4/concepts/scaling-deployments/#long-running-executions))

If you run your agents as a `Job`, KEDA will start a job for each job that is in the queue. The agents will accept one job when they are started and terminate afterwards.
You also achieve fully isolated build environments when using jobs, since an agent is always created for each job.

The following manifest is an example of a `ScaledJob` combined with the Azure Pipelines agent.
You have to use a modified image for this where the agent terminates itself after running a job. ([docs](https://docs.microsoft.com/en-us/azure/devops/pipelines/agents/v2-linux#run-once))

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata:
  name: azdevops-scaledjob
spec:
  jobTargetRef:
    template:
      spec:
        containers:
        - name: azdevops-agent-job
          image: <azdevops-image>
          imagePullPolicy: Always
          env:
          - name: AZP_URL
            value: "<organizationUrl>"
          - name: AZP_TOKEN
            value: "<token>"
          - name: AZP_POOL
            value: "<agentpool>"
          volumeMounts:
          - mountPath: /var/run/docker.sock
            name: docker-volume
        volumes:
        - name: docker-volume
          hostPath:
            path: /var/run/docker.sock
  pollingInterval: 30
  successfulJobsHistoryLimit: 5
  failedJobsHistoryLimit: 5
  maxReplicaCount: 10   
  scalingStrategy:
    strategy: "default"               
  triggers:
  - type: azure-pipelines
    metadata:
      poolID: "1"
      organizationURLFromEnv: "AZP_URL"
      personalAccessTokenFromEnv: "AZP_TOKEN"
```

### Placeholder agent

You cannot queue a build on an empty Agent pool because Azure Pipelines cannot validate the pool matches the requirements for the build.
When you try to do this you will encounter the following error:

> ##[error]No agent found in pool keda-demo which satisfies the specified demands: Agent.Version -gtVersion 2.163.1

You can however use a workaround to register an agent as a placeholder, you are able to queue builds on an agent pool with no online agents.
Make sure you don't execute any cleanup code in your container to unregister the agent when removing it to keep the placeholder agent registerd in the agent pool.

### ScaledJobs in action

To be able to fully create agent on-demand, a template agent was created as a placeholder to be able to queue jobs.

![placeholder agent](/img/blog/azure-pipelines-scaler/placeholder-agent.png)

Jobs are queued:

![azure devops builds](/img/blog/azure-pipelines-scaler/jobs-builds.png)

KEDA will create a job for each pending job in the queue for the specified agent pool.

```sh
$ kubectl get pods
NAME                             READY   STATUS    RESTARTS   AGE
azdevops-scaledjob-2hshf-mp5jl   1/1     Running   0          24s
azdevops-scaledjob-5gzr5-p8625   1/1     Running   0          24s
azdevops-scaledjob-mmlzc-rw5gm   1/1     Running   0          24s
```

![scaledjobs agents](/img/blog/azure-pipelines-scaler/jobs-agents-autoscaled.png)

Using a `ScaledJob` is the preferred way to autoscale your Azure Pipelines agents if you have long running jobs.
The other option is using a `deployment` and leveraging the container lifecycle ([docs](https://keda.sh/docs/1.4/concepts/scaling-deployments/#leverage-the-container-lifecycle))