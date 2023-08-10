+++
title = "Temporal"
availability = "v2.13+"
maintainer = "Community"
description = "Scale applications based on Temporal worflows & activity."
go_file = "temporal_scaler"
+++

### Trigger Specification

This specification describes the `temporal` trigger that scales based on a temporal workflow & activity.

```yaml
triggers:
  - type: temporal
    metadata:
      namespace: default
      workflowName: SayHello
      activityName: say_hello
      targetQueueSize: "5"
      activationTargetQueueSize: "0"
      endpoint: temporal-frontend.temporal.svc.cluster.local:7233
```

**Parameter list:**

- `endpoint` - This parameter specifies the URL of the Temporal gRPC service. You need to provide the service address in the format `<hostname>:<port>`. (Required)
- `workflowName` - workflowName is the name of the Temporal workflow. (Required)
- `activityName` - This parameter allows you to list the names of activities associated with the workflow, separated by commas. If left empty, activity names will not be considered during evaluation. (Optional)
- `namespace` -  You can specify the namespace in which the workflow operates. The default value is default, but you can provide a different namespace if needed. (Optional)
- `activationTargetQueueSize` - This sets the target value for activating the scaler. More information about activation thresholds can be found  [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).The default value is 0, but you can adjust it as required. (Optional)
- `targetQueueSize` - Target value for queue length passed to the scaler. The scaler will cause the replicas to increase if the queue message count is greater than the target value per active replica. (Default: `5`, Optional)

### Example

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: workload-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: workload-scaledobject
  pollingInterval: 5
  cooldownPeriod:  10
  minReplicaCount: 0
  maxReplicaCount: 5
  triggers:
  - type: temporal
    metadata:
      namespace: default
      workflowName: SayHello
      activityName: say_hello
      targetQueueSize: "2"
      activationTargetQueueSize: "3"
      endpoint: temporal-frontend.temporal.svc.cluster.local:7233
```