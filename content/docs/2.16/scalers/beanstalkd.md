+++
title = "Beanstalkd"
availability = "v2.16+"
maintainer = "Community"
description = "Scale applications based on beanstalkd queues"
go_file = "beanstalkd_scaler"
+++

### Trigger Specification

This specification describes the `beanstalkd` trigger that scales based on the number of jobs in a Beanstalkd queue.

```yaml
triggers:
  - type: beanstalkd
    metadata:
      server: beanstalkd.internal-namespace:11300
      includeDelayed: "false"
      tube: "default"
      activationValue: "10"
      value: "15"
      timeout: "30"

```

**Parameter list:**

- `server` - Address of beanstalkd server `<host>:<port>`. If no port is specified then the scaler will default to `11300`.
- `includeDelayed` - Whether to include delayed jobs in the count used for scaling. Defaults to false so only `ready` and `reserved` jobs are counted.
- `tube` - Name of the tube to scale on.
- `activationValue` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional, This value can be a float)
- `value` - Number of jobs in the queue to trigger on. Defaults to `ready`+`reserved` jobs if `includeDelayed` isn't set.
- `timeout` - Timeout in seconds for establishing a connection to the beanstalkd server. (Default: `30`, Optional)

### Authentication Parameters

No authentication should be needed to connect to the beanstalkd server.

### Example

#### Default tube with activation value

Here the scaler will not be active until there are at least 10 jobs in the tube. Delayed jobs are not included as `includeDelayed` will be set to a default of `false`.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: beanstalkd-scaledobject
spec:
  scaleTargetRef:
    name: beanstalkd-consumer
  maxReplicaCount: 20
  triggers:
    - type: beanstalkd
      metadata:
        server: beanstalkd.internal-namespace:11300
        tube: 'default'
        activationValue: "10"
        value: "20"
```

#### User-created tube with minimum replicas

A minimum number of replicas is specified here so the scaler will always be active. This means scaling will occur as soon as the job count goes above 5. Delayed jobs are included here.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: beanstalkd-scaledobject
spec:
  scaleTargetRef:
    name: beanstalkd-consumer
  minReplicaCount: 1
  maxReplicaCount: 20
  triggers:
    - type: beanstalkd
      metadata:
        server: beanstalkd.internal-namespace:11300
        tube: 'scaling-tube'
        value: "5"
        includeDelayed: "true"
```
