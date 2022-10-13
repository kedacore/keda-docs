+++
title = "Integrate with Prometheus"
description = "Overview of all Prometheus metrics that KEDA provides"
weight = 200
+++

## Prometheus Exporter Metrics

### Operator 

The KEDA Operator exposes Prometheus metrics which can be scraped on port `8080` at `/metrics`. The following metrics are being gathered:

- Metrics exposed by the `Operator SDK` framework as explained [here](https://sdk.operatorframework.io/docs/building-operators/golang/advanced-topics/#metrics).

### Metrics Adapter

The KEDA Metrics Adapter exposes Prometheus metrics which can be scraped on port `9022` (this can be changed by setting the `metrics-port` argument for the Metrics Adapter) at `/metrics`.  The metrics collected in the Metrics Adapter are only active when the HPA is active (> 0 replicas).

The following metrics are being gathered:

- `keda_metrics_adapter_scaler_error_totals` - The total number of errors encountered for all scalers.
- `keda_metrics_adapter_scaled_object_error_totals`- The number of errors that have occurred for each scaled object.
- `keda_metrics_adapter_scaler_errors` - The number of errors that have occurred for each scaler.
- `keda_metrics_adapter_scaler_metrics_value`- The current value for each scaler's metric that would be used by the HPA in computing the target average.
