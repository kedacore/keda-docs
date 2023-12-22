+++
title= "Integrate with OpenTelemetry Collector (Experimental)"
description= "Detail of integrating OpenTelemetry Collector in KEDA"
weight = 100
+++

## Push Metrics to OpenTelemetry Collector (Experimental)

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

| Metric | Description |
| ------ | ----------- |
| `keda.build.info` | Info metric, with static information about KEDA build like: version, git commit and Golang runtime info. |
| `keda.scaler.active` | This metric marks whether the particular scaler is active (value == 1) or in-active (value == 0). |
| `keda.scaled.object.paused` | This metric indicates whether a ScaledObject is paused (value == 1) or un-paused (value == 0). |
| `keda.scaler.metrics.value` | The current value for each scaler's metric that would be used by the HPA in computing the target average. |
| `keda.scaler.metrics.latency` | The latency of retrieving current metric from each scaler. |
| `keda.scaler.errors` | The number of errors that have occurred for each scaler. |
| `keda.scaler.errors.total` | The total number of errors encountered for all scalers. |
| `keda.scaled.object.errors` | The number of errors that have occurred for each ScaledObject. |
| `keda.resource.totals` | Total number of KEDA custom resources per namespace for each custom resource type (CRD). |
| `keda.trigger.totals` | Total number of triggers per trigger type. |
| `keda.internal.scale.loop.latency` | Total deviation (in milliseconds) between the expected execution time and the actual execution time for the scaling loop. This latency could be produced due to accumulated scalers latencies or high load. This is an internal metric. |
| `keda.cloudeventsource.events.emitted` | Measured emitted cloudevents with destination of this emitted event (eventsink) and emitted state. |
| `keda.cloudeventsource.events.queued` | The number of events that are in the emitting queue. |
