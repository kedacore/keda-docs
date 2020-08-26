+++
title = "Metrics API"
layout = "scaler"
availability = "v2.0+"
maintainer = "Community"
description = "Scale applications based on a metric from an API"
go_file = "metrics_api_scaler"
+++

### Trigger Specification

This specification describes the `metrics-api` trigger that scales based on a metric value from an API.

The metrics API requires following configuration values:
- `apiURL` string repesenting the base URL of the API (i.e `http://app:1317/api/v1/`).
- `metricName` the metric name to be used to retive value .
- `targetValue` the target value is the target value to scale on. When the metric provided by the 
    API is equal or higher to this value, KEDA will start scaling out.

An example of scaled object spec using metric API:

```yaml
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

### Trigger prerequisites

To use an external API it has to comply with:

```yaml
openapi: 3.0.1
info:
  title: KEDA - External Metric Source Petstore
  description: >-
    This is the specification to comply with for external KEDA metric sources.
  termsOfService: 'http://swagger.io/terms/'
  contact:
    email: apiteam@swagger.io
  license:
    name: Apache 2.0
    url: 'http://www.apache.org/licenses/LICENSE-2.0.html'
  version: 1.0.0
externalDocs:
  description: Find out more about Swagger
  url: 'http://swagger.io'
servers:
  - url: 'https://samples.keda.sh/'
tags:
  - name: Health
    description: Operations about runtime health
  - name: Metrics
    description: Operations about providing metrics to KEDA
paths:
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
  /api/v1/metrics:
    get:
      summary: Get All Metrics
      description: Provides a list of all supported metrics
      operationId: GetMetrics
      responses:
        '200':
          description: Metric inforation was provided
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MetricInfo'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '500':
          description: Unable to determine metric information
      tags:
        - Metrics
      security:
        - basic_auth: []
        - api_key: []
  /api/v1/health:
    get:
      summary: Get Health
      description: Provides information about the health of the runtime
      operationId: GetHealth
      responses:
        '200':
          description: External metric source is healthy
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '500':
          description: External metric source is not healthy
      tags:
        - Health
      security:
        - basic_auth: []
        - api_key: []
components:
  schemas:
    MetricInfo:
      type: array
      items:
        type: object
        properties:
          name:
            type: string
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
  responses:
    UnauthorizedError:
      description: Authentication information is missing or invalid
  securitySchemes:
    basic_auth:
      type: http
      scheme: basic
    api_key:
      type: apiKey
      name: X-API-Key
      in: header
security:
  - basic_auth: []
  - api_key: []
```
