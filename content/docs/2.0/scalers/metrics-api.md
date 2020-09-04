+++
title = "Metrics API"
layout = "scaler"
availability = "v2.0+"
maintainer = "Community"
description = "Scale applications based on a metric provided by an API"
go_file = "metrics_api_scaler"
+++

### Trigger Specification

This specification describes the `metrics-api` trigger that scales based on a metric value provided by an API. 
This scaler allows users to utilize any existing APIs as a metric provider.  

**Parameter list:**
- `url`: Full URL of the API operation to call to get the metric value (eg. `http://app:1317/api/v1/stats`).
- `valueLocation`: [GJSON path notation](https://github.com/tidwall/gjson#path-syntax) to refer to the field in 
    the payload containing the metric value
- `targetValue`: Target value to scale on. When the metric provided by the API is equal or higher to this value, 
    KEDA will start scaling out. When the metric is 0 or less, KEDA will scale down to 0.

Here is an example of trigger configuration using metric-api scaler:

```yaml
triggers:
- type: metric-api
  metadata:
    targetValue: "8"
    url: "http://api:3232/api/v1/stats"
    valueLocation: "components.worker.tasks"
```

### Authentication Parameters

Not supported yet.

### Example

When checking current metric this scaler sends GET request to provided `url` and then uses `valueLocation`
to access the value in response's payload. 

The above example expects that the API endpoint will return response similar to this one:
```json
{
  "components": {
    "worker": {
      "tasks": 12,
      ...
    },
    ...
  },
  ...
}
```
Assuming such response, Metrics API trigger will figure out that current metric value is 12.

> NOTE: This scaler scales deployment to 0 if and only if the value of the metric is lower or equal to zero.

> NOTE: The value of the metric must be json number type. The value is casted to **integer**.
