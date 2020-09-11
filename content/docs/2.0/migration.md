+++
title = "Migration Guide"
+++

## Migrating from KEDA v1 to v2

Please note that you **can not** run both KEDA v1 and v2 on the same Kubernetes cluster. You need to [uninstall](../../1.5/deploy) KEDA v1 first, in order to [install](../deploy) and use KEDA v2.

KEDA v2 is using a new API namespace for it's Custom Resources Definitions (CRD): `keda.sh` instead of `keda.k8s.io` and introduces a new Custom Resource for scaling of Jobs. See full details on KEDA Custom Resources [here](../concepts/#custom-resources-crd).

Here's an overview of what's changed:
- [Scaling of Deployments](#scaling-of-deployments)
- [Scaling of Jobs](#scaling-of-jobs)
- [Improved flexibility & usability of trigger metadata](#improved-flexibility--usability-of-trigger-metadata)
- [Scalers](#scalers)

### Scaling of Deployments
In order to scale `Deployments` with KEDA v2, you need to do only a few modifications to existing v1 `ScaledObjects` definitions, so they comply with v2:
- Change the value of `apiVersion` property from `keda.k8s.io/v1alpha1` to `keda.sh/v1alpha1`
- Rename property `spec.scaleTargetRef.deploymentName` to `spec.scaleTargetRef.name`
- Rename property `spec.scaleTargetRef.containerName` to `spec.scaleTargetRef.envSourceContainerName`
- Label `deploymentName` (in `metadata.labels.`) is no longer needed to be specified on v2 ScaledObject (it was mandatory on older versions of v1)

Please see the examples below or refer to the full [v2 ScaledObject Specification](../concepts/scaling-deployments/#scaledobject-spec)

 **Example of v1 ScaledObject**
```yaml
apiVersion: keda.k8s.io/v1alpha1
kind: ScaledObject
metadata:
  name: {scaled-object-name}
  labels:
    deploymentName: {deployment-name}
spec:
  scaleTargetRef:
    deploymentName: {deployment-name} 
    containerName:  {container-name} 
  pollingInterval: 30  
  cooldownPeriod:  300 
  minReplicaCount: 0   
  maxReplicaCount: 100 
  triggers:
  # {list of triggers to activate the deployment}
```

**Example of v2 ScaledObject**

```yaml
apiVersion: keda.sh/v1alpha1                  #  <--- Property value was changed
kind: ScaledObject
metadata:                                     #  <--- labels.deploymentName is not needed
  name: {scaled-object-name}
spec:
  scaleTargetRef:
    name: {deployment-name}                   #  <--- Property name was changed
    envSourceContainerName: {container-name}  #  <--- Property name was changed   
  pollingInterval: 30            
  cooldownPeriod:  300           
  minReplicaCount: 0             
  maxReplicaCount: 100           
  triggers:
  # {list of triggers to activate the deployment}
```

### Scaling of Jobs

In order to scale `Jobs` with KEDA v2, you need to do only a few modifications to existing v1 `ScaledObjects` definitions, so they comply with v2:
- Change the value of `apiVersion` property from `keda.k8s.io/v1alpha1` to `keda.sh/v1alpha1`
- Change the value of `kind` property from `ScaledObject` to `ScaledJob`
- Remove property `spec.scaleType`
- Remove properties `spec.cooldownPeriod` and `spec.minReplicaCount`   

You can configure `successfulJobsHistoryLimit` and `failedJobsHistoryLimit`. They will remove the old job histories automatically.

Please see the examples below or refer to the full [v2 ScaledJob Specification](../concepts/scaling-jobs/#scaledjob-spec)

**Example of v1 ScaledObject for Jobs scaling**
```yaml
apiVersion: keda.k8s.io/v1alpha1
kind: ScaledObject
metadata:
  name: {scaled-object-name}
spec:
  scaleType: job
  jobTargetRef:
    parallelism: 1 
    completions: 1
    activeDeadlineSeconds: 600
    backoffLimit: 6 
    template:
      # {job template}
  pollingInterval: 30  
  cooldownPeriod:  300 
  minReplicaCount: 0   
  maxReplicaCount: 100 
  triggers:
  # {list of triggers to create jobs}
```

**Example of v2 ScaledJob**

```yaml
apiVersion: keda.sh/v1alpha1              #  <--- Property value was changed
kind: ScaledJob                           #  <--- Property value was changed
metadata:
  name: {scaled-job-name}
spec:                                     #  <--- spec.scaleType are not needed
  jobTargetRef:
    parallelism: 1 
    completions: 1 
    activeDeadlineSeconds: 600
    backoffLimit: 6
    template:
      # {job template}
  pollingInterval: 30                     #  <--- spec.cooldownPeriod and spec.minReplicaCount are not needed
  successfulJobsHistoryLimit: 5           #  <--- property is added
  failedJobsHistoryLimit: 5               #  <--- Property is added
  maxReplicaCount: 100
  triggers:
  # {list of triggers to create jobs}
```

### Improved flexibility & usability of trigger metadata

We've introduced more options to configure trigger metadata to give users more flexibility.

> 💡 **NOTE:** Changes only apply to trigger metadata and don't impact usage of `TriggerAuthentication`

Here's an overview:

| Scaler | 1.x | 2.0 |
|--------|--------|--------|
| `azure-blob` | `connection` (**Default**: `AzureWebJobsStorage`) | `connectionFromEnv` |
| `azure-monitor` | `activeDirectoryClientId` <br /> `activeDirectoryClientPassword` | `activeDirectoryClientId` <br /> `activeDirectoryClientIdFromEnv` <br /> `activeDirectoryClientPasswordFromEnv` |
| `azure-queue` | `connection` (**Default**: AzureWebJobsStorage) | `connectionFromEnv` |
| `azure-servicebus` | `connection` | `connectionFromEnv` |
| `azure-eventhub` | `storageConnection` (**Default**: `AzureWebJobsStorage`) <br /> `connection` (**Default**: `EventHub`) | `storageConnectionFromEnv` <br /> `connectionFromEnv` |
| `aws-cloudwatch` | `awsAccessKeyID` (**Default**: `AWS_ACCESS_KEY_ID`) <br /> `awsSecretAccessKey` (**Default**: `AWS_SECRET_ACCESS_KEY`) | `awsAccessKeyID` <br /> `awsAccessKeyIDFromEnv` <br /> `awsSecretAccessKeyFromEnv` |
| `aws-kinesis-stream` | `awsAccessKeyID` (**Default**: `AWS_ACCESS_KEY_ID`) <br /> `awsSecretAccessKey` (**Default**: `AWS_SECRET_ACCESS_KEY`) | `awsAccessKeyID` <br /> `awsAccessKeyIDFromEnv` <br /> `awsSecretAccessKeyFromEnv` |
| `aws-sqs-queue` | `awsAccessKeyID` (**Default**: `AWS_ACCESS_KEY_ID`) <br /> `awsSecretAccessKey` (**Default**: `AWS_SECRET_ACCESS_KEY`) | `awsAccessKeyID` <br /> `awsAccessKeyIDFromEnv` <br /> `awsSecretAccessKeyFromEnv` |
| `kafka` | _(none)_ | _(none)_
| `rabbitmq` | `apiHost` <br /> `host` | ~~`apiHost`~~ <br /> `host` <br /> `hostFromEnv` |
| `prometheus` | _(none)_ | _(none)_ |
| `cron` | _(none)_ | _(none)_ |
| `redis` | `address` <br /> `host` <br /> `port` <br /> `password` | `address` <br /> `addressFromEnv` <br /> `host` <br /> `hostFromEnv` <br /> ~~`port`~~ <br /> `passwordFromEnv`
| `redis-streams` | `address` <br /> `host` <br /> `port` <br /> `password` |  `address` <br /> `addressFromEnv` <br /> `host` <br /> `hostFromEnv` <br /> ~~`port`~~ <br /> `passwordFromEnv`
| `gcp-pubsub` | `credentials` | `credentialsFromEnv` |
| `external` | _(any matching value)_ | _(any matching value with `FromEnv` suffix)_
| `liiklus` | _(none)_ | _(none)_ |
| `stan` | _(none)_ | _(none)_ |
| `huawei-cloudeye` | | _(none)_ | _(none)_ |
| `postgresql` | `connection` <br /> `password` | `connectionFromEnv` <br /> `passwordFromEnv` |
| `mysql` | `connectionString` <br /> `password` | `connectionStringFromEnv` <br /> `passwordFromEnv` |

### Scalers

**Azure Service Bus**
 - `queueLength` was renamed to `messageCount`

**Kafka**
 - `authMode` property was replaced with `sasl` and `tls` properties. Please refer [documentation](../scalers/apache-kafka/#authentication-parameters) for Kafka Authentication Parameters details.