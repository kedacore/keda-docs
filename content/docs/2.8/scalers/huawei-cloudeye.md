+++
title = "Huawei Cloudeye"
layout = "scaler"
availability = "v1.1+"
maintainer = "Community"
description = "Scale applications based on a Huawei Cloudeye."
go_file = "huawei_cloudeye_scaler"
+++

### Trigger Specification

This specification describes the `huawei-cloudeye` trigger that scales based on a Huawei Cloudeye.

```yaml
triggers:
- type: huawei-cloudeye
  metadata:
    namespace: SYS.ELB
    metricName: mb_l7_qps
    dimensionName: lbaas_instance_id
    dimensionValue: 5e052238-0346-xxb0-86ea-92d9f33e29d2
    targetMetricValue: "5.5"
    activationTargetMetricValue: "1.5"
    minMetricValue: "1.1" # Deprecated
```

**Parameter list:**

- `namespace` - Namespace of the metric.The format is service.item; service and item must be strings, must start with a letter, can only contain 0-9/a-z/A-Z/_, the total length of service.item is 3, the maximum is 32.
- `metricName` - Name of the metric.
- `dimensionName` - Name of the metric dimension.
- `dimensionValue` - Value of the metric dimension.
- `targetMetricValue` - Target value for your metric. (This value can be a float)
- `activationTargetMetricValue` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional, This value can be a float)
- `minMetricValue` - **Deprecated if favor of `activationTargetMetricValue`** Minimum value for your metric. If the actual value of the metric you get from cloudeye is less than the minimum value, then the scaler is not active. (This value can be a float)
- `metricCollectionTime` - Collection time of the metric in seconds. Equivalent to the earliest start time of the end time. (default: 300)
- `metricFilter` - Aggregation method of the metric. (Values: `average`, `max`, `min`, `sum`, Default: `average`, Optional)
- `metricPeriod` - Granularity of the metric in seconds. (Default: 300, Optional)

### Authentication Parameters

You can use `TriggerAuthentication` CRD to configure the authenticate by providing a set of IAM credentials.

**Credential based authentication:**

- `IdentityEndpoint` - Identity Endpoint.
- `ProjectID` - Project ID.
- `DomainID` - Id of domain.
- `Domain` - Domain.
- `Region` - Region.
- `Cloud` - Cloud name. (Default: `myhuaweicloud.com`, Optional)
- `AccessKey` - Id of the user.
- `SecretKey` - Access key for the user to authenticate with.

The user will need access to read data from Huawei Cloudeye.

### Example

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-huawei-secrets 
  namespace: keda-test
data:
  IdentityEndpoint: <IdentityEndpoint>
  ProjectID: <ProjectID>
  DomainID: <DomainID>
  Region: <Region>
  Domain: <Domain>
  AccessKey: <AccessKey>
  SecretKey: <SecretKey>
--- 
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-huawei-credential
  namespace: keda-test
spec:
  secretTargetRef:
  - parameter: IdentityEndpoint      # Required.
    name: keda-huawei-secrets        # Required.
    key: IdentityEndpoint            # Required.
  - parameter: ProjectID             # Required.
    name: keda-huawei-secrets        # Required.
    key: ProjectID                   # Required.
  - parameter: DomainID              # Required.
    name: keda-huawei-secrets        # Required.
    key: DomainID                    # Required.
  - parameter: Region                # Required.
    name: keda-huawei-secrets        # Required.
    key: Region                      # Required.
  - parameter: Domain                # Required.
    name: keda-huawei-secrets        # Required.
    key: Domain                      # Required.
  - parameter: AccessKey             # Required.
    name: keda-huawei-secrets        # Required.
    key: AccessKey                   # Required.
  - parameter: SecretKey             # Required.
    name: keda-huawei-secrets        # Required.
    key: SecretKey                   # Required.
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: huawei-cloudeye-scaledobject
  namespace: keda-test
spec:
  scaleTargetRef:
    name: nginx-deployment
  maxReplicaCount: 5
  minReplicaCount: 2
  triggers:
  - type: huawei-cloudeye
    metadata:
      namespace: SYS.ELB
      dimensionName: lbaas_instance_id
      dimensionValue: 5e052238-0346-47b0-xxea-92d9f33e29d2
      metricName: mb_l7_qps
      targetMetricValue: "100"
      minMetricValue: "1"
    authenticationRef:
      name: keda-trigger-auth-huawei-credential
```
