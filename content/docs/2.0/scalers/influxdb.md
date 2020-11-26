+++
title = "InfluxDB"
layout = "scaler"
availability = "v2.0+"
maintainer = "Community"
description = "Scale applications based on influxdb queries"
+++

### Trigger Specification

This specification describes the `influxdb` trigger that scales based on the results of a flux query.

```yaml
triggers:
  - type: influxdb
    metadata:
      authToken: some-auth-token
      organizationName: influx-org
      authTokenFromEnv: INFLUXDB_AUTH_TOKEN
      organizationNameFromEnv: INFLUXDB_ORG_NAME
      serverURL: http://influxdb:8086
      thresholdValue: '4'
      query: |
        from(bucket: "bucket-of-interest")
        |> range(start: -12h)
        |> filter(fn: (r) => r._measurement == "stat")
```

**Parameter list:**

- The `authToken`/`authTokenFromEnv` field(s) holds the authentication token needed for the influxdb client to communicate with an associated server. `authTokenFromEnv` should hold the name of the environment variable in the target deployment that contains the actual authorization token value.
- `organizationName`/`organizationNameFromEnv` field(s) hold the organization name needed for the client to locate all [information](https://docs.influxdata.com/influxdb/v2.0/organizations/) contained in that organizaation such as buckets, tasks, etc. `organizationNameFromEnv` has the same semantics of pulling a value from the target deployment as `authTokenFromEnv`.
- `serverURL` holds the url value of the influxdb server.
- `thresholdValue` is provided by the user. This value can vary from use case to use case depending on the data of interest, and is needed to trigger the scaling in/out depending on what value comes back from the query.
- `query` is the flux query that will yield the value for the scaler to compare the `thresholdValue` against.

### Authentication Parameters

You can authenticate by using an authorization token.

**Authorization Token Authentication:**

- `authToken` - Authorization token for influx db server.

### Example

Below is an example of how to deploy a scaled object with the `influxdb` scale trigger

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
        authTokenFromEnv: INFLUXDB_AUTH_TOKEN
        organizationNameFromEnv: INFLUXDB_ORG_NAME
        serverURL: http://influxdb:8086
        thresholdValue: '4'
        query: |
          from(bucket: "bucket-of-interest")
          |> range(start: -12h)
          |> filter(fn: (r) => r._measurement == "stat")
```
