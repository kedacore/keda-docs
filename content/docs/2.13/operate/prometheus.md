+++
title = "Integrate with Prometheus"
description = "Overview of all Prometheus metrics that KEDA provides"
weight = 100
+++

## Prometheus Exporter Metrics

### Operator

The KEDA Operator exposes Prometheus metrics which can be scraped on port `8080` at `/metrics`. The following metrics are being gathered:

- `keda_build_info` - Info metric, with static information about KEDA build like: version, git commit and Golang runtime info.
- `keda_internal_scale_loop_latency_seconds` - Total deviation (in seconds) between the expected execution time and the actual execution time for the scaling loop. This latency could be produced due to accumulated scalers latencies or high load. This is an internal metric.
- `keda_resource_handled_total` - Total number of KEDA custom resources per namespace for each custom resource type (CRD) handled by the operator.
- `keda_scaled_object_errors_total` - The number of errors that have occurred for each ScaledObject.
- `keda_scaled_object_paused` - This metric indicates whether a ScaledObject is paused (value == 1) or un-paused (value == 0).
- `keda_scaler_active` - This metric marks whether the particular scaler is active (value == 1) or in-active (value == 0).
- `keda_scaler_errors_total` - The total number of errors encountered for each scaler.
- `keda_scaler_metrics_latency_seconds` - The latency of retrieving current metric from each scaler, in seconds.
- `keda_scaler_metrics_value` - The current value for each scaler's metric that would be used by the HPA in computing the target average.
- `keda_scaler_paused` - This metric marks whether the particular scaler is paused (value == 1) or not paused (value == 0).
- `keda_trigger_handled_total` - Total number of triggers per trigger type handled by the operator.
- Metrics exposed by the `Operator SDK` framework as explained [here](https://sdk.operatorframework.io/docs/building-operators/golang/advanced-topics/#metrics).

#### Deprecated metrics

The following metrics are exposed as well, but are deprecated and will be removed in a future release.

- `keda_internal_scale_loop_latency` -  Replaced by `keda_internal_scale_loop_latency_seconds`.
- `keda_resource_totals` - Replaced by `keda_resource_handled_total`.
- `keda_scaled_object_errors` - Replaced by `keda_scaled_object_errors_total`.
- `keda_scaler_errors_total` - The unlabeled version is deprecated. Sum the `keda_scaler_errors_total`.
- `keda_scaler_errors` - Replaced by `keda_scaler_errors_total` (labeled).
- `keda_scaler_metrics_latency` - Replaced by `keda_scaler_metrics_latency_seconds`.
- `keda_trigger_totals` - Replaced by `trigger_handled_total`.

### Admission Webhooks

The KEDA Webhooks expose Prometheus metrics which can be scraped on port `8080` at `/metrics`. The following metrics are being gathered:

- `keda_webhook_scaled_object_validation_total`- The current value for scaled object validations.
- `keda_webhook_scaled_object_validation_errors` - The number of validation errors.

### Metrics Server

The KEDA Metrics Adapter exposes Prometheus metrics which can be scraped on port `8080` at `/metrics`. The following metrics are being gathered:

- Metrics exposed by the `Operator SDK` framework as explained [here](https://sdk.operatorframework.io/docs/building-operators/golang/advanced-topics/#metrics).

## Premade Grafana dashboard

A premade [Grafana dashboard](https://github.com/kedacore/keda/tree/main/config/grafana/keda-dashboard.json) is available to visualize metrics exposed by the KEDA Metrics Adapter.

![KEDA Grafana dashboard](/img/grafana-dashboard.png)

The dashboard has two sections:

- Visualization of KEDA's metric server
- Visualization of the scale target and its changes in replicas scaled by KEDA

On top, the dashboard supports the following variables:

- datasource
- namespace
- scaledObject
- scaler
- metric
