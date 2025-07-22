+++
title = "InfluxDB"
availability = "v2.1+"
maintainer = "Community"
category = "Data & Storage"
description = "Scale applications based on InfluxDB queries"
go_file = "influxdb_scaler"
+++

### Trigger Specification

This specification describes the `influxdb` trigger that scales based on the results of a InfluxDB query.

```yaml
triggers:
  - type: influxdb
    metadata:
      serverURL: http://influxdb:8086
      organizationName: influx-org
      organizationNameFromEnv: INFLUXDB_ORG_NAME # Optional: You can use this instead of `organizationName` parameter. See details in "Parameter List" section
      thresholdValue: '4.4'
      activationThresholdValue: '6.2'
      query: |
        from(bucket: "bucket-of-interest")
        |> range(start: -12h)
        |> filter(fn: (r) => r._measurement == "stat")
      authToken: some-auth-token
      authTokenFromEnv: INFLUXDB_AUTH_TOKEN # Optional: You can use this instead of `authToken` parameter. See details in "Parameter List" section
```

**Parameter list:**

- `authToken` - Authentication token needed for the InfluxDB client to communicate with an associated server.
- `authTokenFromEnv` - Defines the authorization token, similar to `authToken`, but reads it from an environment variable on the scale target.
- `organizationName` - Organization name needed for the client to locate all information contained in that [organization](https://docs.influxdata.com/influxdb/v2.0/organizations/) such as buckets, tasks, etc.
- `organizationNameFromEnv` - Defines the organization name, similar to `organizationName`, but reads it from an environment variable on the scale target.
- `serverURL` - Holds the url value of the InfluxDB server.
- `thresholdValue` - Provided by the user. This value can vary from use case to use case depending on the data of interest, and is needed to trigger the scaling in/out depending on what value comes back from the query. (This value can be a float)
- `activationThresholdValue` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional, This value can be a float)
- `query` - Flux query that will yield the value for the scaler to compare the `thresholdValue` against.
- `unsafeSsl` - Skip certificate validation when connecting over HTTPS. (Values: `true`, `false`, Default: `false`, Optional)

### Authentication Parameters

You can authenticate by using an authorization token.

**Authorization Token Authentication:**

- `authToken` - Authorization token for InfluxDB server.

### Example

Below is an example of how to deploy a scaled object with the `InfluxDB` scale trigger.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: influxdb-scaledobject
  namespace: my-project
spec:
  scaleTargetRef:
    name: nginx-worker
  triggers:
    - type: influxdb
      metadata:
        serverURL: http://influxdb:8086
        organizationNameFromEnv: INFLUXDB_ORG_NAME
        thresholdValue: '4'
        activationThresholdValue: '6'
        query: |
          from(bucket: "bucket-of-interest")
          |> range(start: -12h)
          |> filter(fn: (r) => r._measurement == "stat")
        authTokenFromEnv: INFLUXDB_AUTH_TOKEN
```
