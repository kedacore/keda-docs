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
      organizationName: influx-org # Required for InfluxDB v2.x, optional for InfluxDB v3.x
      organizationNameFromEnv: INFLUXDB_ORG_NAME # Optional: You can use this instead of `organizationName` parameter. See details in "Parameter List" section
      thresholdValue: '4.4'
      activationThresholdValue: '6.2'
      query: |
        from(bucket: "bucket-of-interest")
        |> range(start: -12h)
        |> filter(fn: (r) => r._measurement == "stat")
      metricKey: 'mymetric' # Required for Influx v3. Ignored for v2. See details in "Parameter List" section
      queryType: 'InfluxQL' # Required for Influx v3. Ignored for v2. See details in "Parameter List" section
      influxVersion: '2' # Optional: Defaults to 2.
      database: 'some-influx-db' # Required for Influx v3
      authToken: some-auth-token
      authTokenFromEnv: INFLUXDB_AUTH_TOKEN # Optional: You can use this instead of `authToken` parameter. See details in "Parameter List" section
```

**Parameter list:**

- `authToken` - Authentication token needed for the InfluxDB client to communicate with an associated server.
- `authTokenFromEnv` - Defines the authorization token, similar to `authToken`, but reads it from an environment variable on the scale target.
- `organizationName` - Organization name needed for the client to locate all information contained in that [organization](https://docs.influxdata.com/influxdb/v2.0/organizations/) such as buckets, tasks, etc (Optional, Required if `influxVersion: '2'`).
- `organizationNameFromEnv` - Defines the organization name, similar to `organizationName`, but reads it from an environment variable on the scale target.
- `serverURL` - Holds the url value of the InfluxDB server.
- `thresholdValue` - Provided by the user. This value can vary from use case to use case depending on the data of interest, and is needed to trigger the scaling in/out depending on what value comes back from the query. (This value can be a float)
- `activationThresholdValue` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional, This value can be a float)
- `influxVersion` - Specifies the version of InfluxDB being used. (Values: `2`, `3`, Default: `2`, Optional)
- `database` - The name of the InfluxDB database to query. Required for InfluxDB v3.x. (Optional for InfluxDB v2.x)
- `metricKey` - The name of the metric to be used for scaling decisions. This is required for InfluxDB v3.x and ignored for InfluxDB v2.x. It is used to identify the metric in the query results. For a `query` of `SELECT mean("mymetric") AS "metric_name" FROM...` use `metricKey: 'metric_name'`. (Optional, Required if `influxVersion: '3'`)
- `queryType` - Specifies the type of query being used. For InfluxDB v3.x, this can be either `InfluxQL` or `FlightSQL`. For InfluxDB v2.x, this parameter is ignored. (Values: `InfluxQL`, `FlightSQL`, Default: `InfluxQL`, Optional)
- `query` - Flux query that will yield the value for the scaler to compare the `thresholdValue` against.
- `unsafeSsl` - Skip certificate validation when connecting over HTTPS. (Values: `true`, `false`, Default: `false`, Optional)

### Authentication Parameters

You can authenticate by using an authorization token.

**Authorization Token Authentication:**

- `authToken` - Authorization token for InfluxDB server.

### Example (InfluxDB v2)

Below is an example of how to deploy a scaled object with the `InfluxDB` (v2) scale trigger.

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

### Example (InfluxDB v3)

Below is a similar example for Influx v3 using an `InfluxQL` query.

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
        database: 'my-metrics-db'
        influxVersion: '3'
        queryType: 'InfluxQL'
        metricKey: 'mean'
        thresholdValue: '2'
        activationThresholdValue: '10'
        query: |
          SELECT mean("water_level") FROM "h2o_feet"
          GROUP BY time(5m)
          ORDER BY time DESC LIMIT 1;
        authTokenFromEnv: INFLUXDB_AUTH_TOKEN
```
