+++
title = "Migration Guide"
+++

## Migrating from KEDA v1 to v2

Please note that you **can not** run both KEDA v1 and v2 on the same Kubernetes cluster. You need to [uninstall](../../1.5/deploy) KEDA v1 first, in order to [install](../deploy) and use KEDA v2.

KEDA v2 is using a new API namespace for it's Custom Resources Definitions (CRD): `keda.sh` instead of `keda.k8s.io` and introduces a new Custom Resource for scaling of Jobs. See full details on KEDA Custom Resources [here](../concepts/#custom-resources-crd).

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

TODO description

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

TODO
