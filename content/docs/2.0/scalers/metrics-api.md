+++
title = "Metrics API"
layout = "scaler"
availability = "v2.0+"
maintainer = "Community"
description = "Scale applications based on a metric from an API"
go_file = "metrics_api_scaler"
+++

### Trigger Specification

This specification describes the `metrics-api` trigger that scales based on a metric value from an API. This scaler
allows users to utilize any existing APIs as a source of metric.  

The metrics-api trigger requires following configuration values:
- `url` string representing the full URL that will be used to get the metric (i.e `http://app:1317/api/v1/stats`).
- `valueLocation` string using [GJSON path notation](https://github.com/tidwall/gjson#path-syntax) to point to
    required value that will be used as current metric value 
- `targetValue` the target value is the target value to scale on. When the metric provided by the 
    API is equal or higher to this value, KEDA will start scaling out.

Here is an example of trigger configuration using metric-api scaler:

```yaml
triggers:
- type: metric-api
  metadata:
    targetValue: "8"
    url: "http://api:3232/api/v1/stats"
    valueLocation: "components.worker.tasks"
```

When checking current metric this scaler sends GET request to provided `url` and then uses `valueLocation`
to access the value in response's payload. The above example expects that used API will return response similar to this
one:
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
Assuming such response, metric-api trigger will figure out that current metric value is 12. And because 12 > 8 it
would make KEDA to start scaling out.  

**Note**:
This scaler scales deployment to 0 if and only if the value of the metric is lower or equal to zero.

The value of the metric must be json number type. The value is casted to **integer**.
