---
title: "Integrate with OpenTelemetry Collector"
date: 2023-08-30T11:13:57+08:00
draft: true
---

## Push Metrics to OpenTelemetry Collector

### Operator

The KEDA Operator supports outputting metrics to the OpenTelemetry collector using HTTP. The parameter `--enable-opentelemetry-metrics=true` needs to be set. KEDA will push metrics to the OpenTelemetry collector specified by the `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable. Other environment variables in OpenTelemetry are also supported (https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/). Here is an example configuration of the operator: 
```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: keda-operator
  ...
      containers:
        - name: keda-operator
          image: ghcr.io/kedacore/keda:latest
          command:
            - /keda
          args:
            --enable-opentelemetry-metrics=true
            ...
          ...
          env:
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "http://opentelemetry-collector.default.svc.cluster.local:4318"
```


The following metrics are being gathered:

- `build.info` - Info metric, with static information about KEDA build like: version, git commit and Golang runtime info.
- `scaler.active` - This metric marks whether the particular scaler is active (value == 1) or in-active (value == 0).
- `scaler.metrics.value` - The current value for each scaler's metric that would be used by the HPA in computing the target average.
- `scaler.metrics.latency` - The latency of retrieving current metric from each scaler.
- `scaler.errors` - The number of errors that have occurred for each scaler.
- `scaler.errors.total` - The total number of errors encountered for all scalers.
- `scaled.object.errors` - The number of errors that have occurred for each ScaledObject.
- `resource.totals` - Total number of KEDA custom resources per namespace for each custom resource type (CRD).
- `trigger.totals` - Total number of triggers per trigger type.
- `internal.scale.loop.latency` - Total deviation (in milliseconds) between the expected execution time and the actual execution time for the scaling loop. This latency could be produced due to accumulated scalers latencies or high load. This is an internal metric.


