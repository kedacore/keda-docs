+++
title = "InfluxDB"
layout = "scaler"
availability = "v2.1+"
maintainer = "Community"
description = "Scale applications based on InfluxDB queries"
+++

### Trigger Specification

This specification describes the `InfluxDB` trigger that scales based on the results of a flux query.

```yaml
triggers:
  - type: influxdb
    metadata:
      serverURL: http://influxdb:8086
      organizationName: influx-org
      organizationNameFromEnv: INFLUXDB_ORG_NAME
      thresholdValue: '4'
      query: |
        from(bucket: "bucket-of-interest")
        |> range(start: -12h)
        |> filter(fn: (r) => r._measurement == "stat")
      authToken: some-auth-token
      authTokenFromEnv: INFLUXDB_AUTH_TOKEN
```

**Parameter list:**

- `authToken` field holds the authentication token needed for the InfluxDB client to communicate with an associated server. 
- `authTokenFromEnv` defines the authorization token, similar to `authToken`, but reads it from an environment variable on the scale target.
- `organizationName` is the organization name needed for the client to locate all information contained in that [organization](https://docs.influxdata.com/influxdb/v2.0/organizations/) such as buckets, tasks, etc.
- `organizationNameFromEnv` defines the organization name, similar to `organizationName`, but reads it from an environment variable on the scale target.
- `serverURL` holds the url value of the InfluxDB server.
- `thresholdValue` is provided by the user. This value can vary from use case to use case depending on the data of interest, and is needed to trigger the scaling in/out depending on what value comes back from the query.
- `query` is the flux query that will yield the value for the scaler to compare the `thresholdValue` against.

### Authentication Parameters

You can authenticate by using an authorization token.

**Authorization Token Authentication:**

- `authToken` - Authorization token for InfluxDB server.

### Example

Below is an example of how to deploy a scaled object with the `InfluxDB` scale trigger

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
        query: |
          from(bucket: "bucket-of-interest")
          |> range(start: -12h)
          |> filter(fn: (r) => r._measurement == "stat")
        authTokenFromEnv: INFLUXDB_AUTH_TOKEN
```
