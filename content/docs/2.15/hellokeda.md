+++
title = "Hello, KEDA"
+++

## Hello, KEDA 

This guide will help you create an Azure Function that triggers on new messages in an Azure Storage Queue. You’ll also learn how to deploy it to Kubernetes with KEDA for event-driven activation and scaling.

## What You'll Need

- [Azure Function Core Tools v3](https://github.com/azure/azure-functions-core-tools#installing) (version > 3.0.3216)
- An Azure Subscription ([get a free account](http://azure.com/free))
- A Kubernetes cluster (e.g., [AKS](https://docs.microsoft.com/en-us/azure/aks/kubernetes-walkthrough-portal), GKE, EKS, OpenShift) with [`kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl/), be sure to [enable Virtual Nodes](https://docs.microsoft.com/en-us/azure/aks/virtual-nodes-portal) at create.
- Docker and a Docker registry

## Step-by-Step Guide

1. **Create a new directory for the function app**

```sh
mkdir hello-keda
cd hello-keda
```

2. **Initialize the Directory for Functions**

```sh
func init . --docker
```

Select **node** and **JavaScript**.

3. **Add a New Queue Triggered Function**

```sh
func new
```

Select **Azure Queue Storage Trigger** and use the default name `QueueTrigger`.

> 💡 **NOTE:** You can use the [Azure CLI](https://docs.microsoft.com/cli/azure/install-azure-cli?view=azure-cli-latest), the [Azure cloud shell](https://shell.azure.com), or [the Azure portal](https://docs.microsoft.com/azure/storage/common/storage-quickstart-create-account#create-a-storage-account-1). The following is how you do it using Azure CLI.

4. **Create an Azure Storage Queue:** Create a storage account and a queue named `js-queue-items`. Replace `<storage-name>` with a unique name for your storage account.

```sh
az group create -l westus -n hello-keda
az storage account create --sku Standard_LRS --location westus -g hello-keda -n <storage-name>

CONNECTION_STRING=$(az storage account show-connection-string --name <storage-name> --query connectionString -o tsv)

az storage queue create -n js-queue-items --connection-string $CONNECTION_STRING
```

5. **Update Function Settings with Storage Account Info**: Open the `hello-keda` directory in an editor.  We'll need to update the connection string info for the queue trigger, and make sure the queue trigger capabilities are installed.

Copy the current storage account connection string (HINT: don't include the `"`)

```sh
az storage account show-connection-string --name <storage-name> --query connectionString
```

Open `local.settings.json` and replace `{AzureWebJobsStorage}` with your connection string:

**local.settings.json**
```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "DefaultEndpointsProtocol=https;EndpointSuffix=core.windows.net;AccountName=mystorageaccount;AccountKey=shhhh==="
  }
}
```

Open `QueueTrigger/function.json` and set the `connection` value to `AzureWebJobsStorage`:

**function.json**
```json
{
  "bindings": [
    {
      "name": "myQueueItem",
      "type": "queueTrigger",
      "direction": "in",
      "queueName": "js-queue-items",
      "connection": "AzureWebJobsStorage"
    }
  ]
}
```

6. **Enable Storage Queue Support**: Update `host.json` to include the storage queue extension bundle:

**host.json**
```json
{
  "version": "2.0",
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[1.*, 2.0.0)"
  }
}
```

7. **Test Your Function Locally (Optional)**: Start your function locally:

```sh
func start
```

Use the Azure Portal’s Storage Explorer to add a message to the `js-queue-items` queue. Your function should process the message and display the output in the console.

```cli
[5/1/19 6:00:53 AM] Executing 'Functions.QueueTrigger' (Reason='New queue message detected on 'js-queue-items'.', Id=2beeca56-4c7a-4af9-b15a-86d896d55a92)
[5/1/19 6:00:53 AM] Trigger Details: MessageId: 60c80a55-e941-4f78-bb93-a1ef006c3dc5, DequeueCount: 1, InsertionTime: 5/1/19 6:00:53 AM +00:00
[5/1/19 6:00:53 AM] JavaScript queue trigger function processed work item Hello KEDA
[5/1/19 6:00:53 AM] Executed 'Functions.QueueTrigger' (Succeeded, Id=2beeca56-4c7a-4af9-b15a-86d896d55a92)
```

8. **Install KEDA:** Follow the [KEDA installation guide](/deploy.md) to deploy KEDA to your Kubernetes cluster. Confirm KEDA is installed by running:

```sh
kubectl get customresourcedefinition
```

You should see `scaledobjects.keda.sh` and `scaledjobs.keda.sh`.

**9a. Deploy Your Function App to Kubernetes with KEDA (Standard):** Log in to Docker:

```sh
docker login
```

Make sure you have created a private repo in docker.io to which your container image will be pushed. Then deploy your function to Kubernetes:

```sh
func kubernetes deploy --name hello-keda --registry <docker-user-id>
```

This will build the docker container, push it to the specified registry, and deploy it to Kubernetes. You can see the actual generated deployment with the `--dry-run` flag.


9b. **Deploy Your Function App to Kubernetes with KEDA (Virtual Nodes)**: To deploy your function Kubernetes with Azure Virtual Nodes, you need to modify the details of the deployment to allow the selection of virtual nodes.

Generate a deployment yaml for the function.

```sh
func kubernetes deploy --name hello-keda --registry <docker-user-id> --javascript --dry-run > deploy.yaml
```

Modify `deploy.yaml` to allow scheduling on virtual nodes:

```yaml
spec:
  containers:
  - name: hello-keda
    image: <docker-user-id>/hello-keda
    env:
    - name: AzureFunctionsJobHost__functions__0
      value: QueueTrigger
    envFrom:
    - secretRef:
        name: hello-keda
  tolerations:
  - operator: Exists
```

Build and deploy your container image:

```sh
docker build -t <docker-user-id>/hello-keda .
docker push <docker-user-id>/hello-keda

kubectl apply -f deploy.yaml
```

10. **Verify Your Function Scales with KEDA**:Initially, you should see 0 pods:

```sh
kubectl get deploy
```

Add a queue message to the queue (using the Storage Explorer shown in step 7 above).  KEDA will detect the event and add a pod.  By default the polling interval set is 30 seconds on the `ScaledObject` resource, so it may take up to 30 seconds for the queue message to be detected and activate your function.  This can be [adjusted on the `ScaledObject` resource](https://github.com/kedacore/keda/wiki/ScaledObject-spec).

```sh
kubectl get pods -w
```

The queue message will be consumed.  You can validate the message was consumed by using `kubectl logs` on the activated pod.  New queue messages will be consumed and if enough queue messages are added the function will autoscale.  After all messages are consumed and the cooldown period has elapsed (default 300 seconds), the last pod should scale back down to zero.

## Cleaning Up

#### Delete the Function Deployment

```sh
kubectl delete deploy hello-keda
kubectl delete ScaledObject hello-keda
kubectl delete Secret hello-keda
```

#### Delete the Storage Account

```sh
az storage account delete --name <storage-name>
```

#### Uninstall KEDA

```sh
func kubernetes remove --namespace keda
```

## Source Code

You can find the source code for this tutorial on KEDA’s GitHub: [sample-hello-world-azure-functions](https://github.com/kedacore/sample-hello-world-azure-functions).
