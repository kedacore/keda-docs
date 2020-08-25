+++
title = "Metrics API"
layout = "scaler"
availability = "v2.0+"
maintainer = "Community"
description = "Scale applications based on a metric value from an API"
go_file = "metrics_api_scaler"
+++

This specification describes the `metrics-api` trigger that scales based on a metric value from an API.

### Trigger prerequisites

To use an external API as a source of metric you need to have a following endpoint:

```yaml
/api/v1/metric/{metric}:
  get:
    summary: Get Metric
    description: Get value for a given metric
    operationId: GetMetric
    parameters: 
     - name: metric
       in: path
       required: true
       schema:
          type: string
       description: Name of the metric for which information is requested
    responses:
      '200':
        description: Metric inforation was provided
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ReportedMetric'
      '404':
        description: Metric is not supported
      '401':
        $ref: '#/components/responses/UnauthorizedError'
      '500':
        description: Unable to determine metric information
    tags:
      - Metrics
    security:
      - basic_auth: []
      - api_key: []
```
which returns:
```yaml
ReportedMetric:
  type: object
  required:
    - name
    - value
  properties:
    name:
      type: string
    value:
      type: number
```


### Trigger Specification

The metrics API requires following configuration values:
- `apiURL` string repesenting the base URL of the API (i.e `http://app:1317/api/v1/`).
- `metricName` the metric name to be used to retive value .
- `targetValue` the target value for HPA. As long as the current metric doesn't match `TargetValue`, 
  HPA will increase the number of the pods until it reaches the maximum number of pods allowed to scale to.


An example of scaled object using metric API:

```yaml
apiVersion: keda.k8s.io/v1alpha1
kind: ScaledObject
metadata:
  name: metrics-api-scaledobject
  namespace: default
  labels:
    deploymentName: dummy
spec:
  maxReplicaCount: 4
  scaleTargetRef:
    deploymentName: dummy
  triggers:
    - type: metric-api
      metadata:
        targetValue: "1"
        apiURL: "http://api:3232/api/v1"
        metricName: "workersNumber"
```

**Note**:
This scaler scales deployment to 0 if and only if the value of the metric is lower or equal to zero.
