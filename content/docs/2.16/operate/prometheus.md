+++
title = "Integrate with Prometheus"
description = "Overview of all Prometheus metrics that KEDA provides"
weight = 100
+++

## Prometheus Exporter Metrics

### Operator

The KEDA Operator exposes Prometheus metrics which can be scraped on port `8080` at `/metrics`. The following metrics are being gathered:

- `keda_build_info` - Info metric, with static information about KEDA build like: version, git commit and Golang runtime info.
- `keda_scaler_active` - This metric marks whether the particular scaler is active (value == 1) or in-active (value == 0).
- `keda_scaled_object_paused` - This metric indicates whether a ScaledObject is paused (value == 1) or un-paused (value == 0).
- `keda_scaler_metrics_value` - The current value for each scaler's metric that would be used by the HPA in computing the target average.
- `keda_scaler_metrics_latency_seconds` - The latency of retrieving current metric from each scaler.
- `keda_scaler_detail_errors_total` - The number of errors encountered for each scaler.
- `keda_scaled_object_errors_total` - The number of errors that have occurred for each ScaledObject.
- `keda_scaled_job_errors_total` - The number of errors that have occurred for each ScaledJob.
- `keda_resource_registered_total` - Total number of KEDA custom resources per namespace for each custom resource type (CRD) handled by the operator.
- `keda_trigger_registered_total` - Total number of triggers per trigger type handled by the operator.
- `keda_internal_scale_loop_latency_seconds` - Total deviation (in seconds) between the expected execution time and the actual execution time for the scaling loop. This latency could be produced due to accumulated scalers latencies or high load. This is an internal metric.
- `keda_cloudeventsource_events_emitted_total` - Measured emitted cloudevents with destination of this emitted event (eventsink) and emitted state.
- `keda_cloudeventsource_events_queued` - The number of events that are in the emitting queue.
- `keda_internal_metricsservice_grpc_server_started_total` - Total number of RPCs started on the server.
- `keda_internal_metricsservice_grpc_server_handled_total` - Total number of RPCs completed on the server, regardless of success or failure.
- `keda_internal_metricsservice_grpc_server_msg_received_total` - Total number of RPC stream messages received on the server.
- `keda_internal_metricsservice_grpc_server_msg_sent_total` - Total number of gRPC stream messages sent by the server.
- `keda_internal_metricsservice_grpc_server_handling_seconds` - Histogram of response latency (seconds) of gRPC that had been application-level handled by the server.
- Metrics exposed by the `Operator SDK` framework as explained [here](https://sdk.operatorframework.io/docs/building-operators/golang/advanced-topics/#metrics).

> Note: When you deploy the KEDA Operator without any scalers deployed, the only metric you will see is `keda_build_info`. As you deploy scalers, you will start to see some of the metrics listed above but it is dependant on the types of scalers you have deployed.

#### Deprecated metrics

The following metrics are exposed as well, but are deprecated and will be removed in KEDA v2.16.

- `keda_scaler_metrics_latency` - The latency of retrieving current metric from each scaler. Replaced by `keda_scaler_metrics_latency_seconds`.
- `keda_scaler_errors` - The number of errors that have occurred for each scaler. Replaced by `keda_scaler_detail_errors_total`.
- `keda_scaler_errors_total` - The total number of errors encountered for all scalers. Replaced by `keda_scaler_detail_errors_total`.
- `keda_scaled_object_errors` - The number of errors that have occurred for each ScaledObject. Replaced by `keda_scaled_object_errors_total`.
- `keda_scaled_job_errors` - The number of errors that have occurred for each ScaledJob. Replace by `keda_scaled_job_errors_total`.
- `keda_resource_totals` - Total number of KEDA custom resources per namespace for each custom resource type (CRD). Replaced by `keda_resource_registered_total`.
- `keda_trigger_totals` - Total number of triggers per trigger type. Replaced by `keda_trigger_registered_total`.
- `keda_internal_scale_loop_latency` - Total deviation (in milliseconds) between the expected execution time and the actual execution time for the scaling loop. This latency could be produced due to accumulated scalers latencies or high load. This is an internal metric. Replaced by `keda_internal_scale_loop_latency_seconds`.

### Admission Webhooks

The KEDA Webhooks expose Prometheus metrics which can be scraped on port `8080` at `/metrics`. The following metrics are being gathered:

- `keda_webhook_scaled_object_validation_total`- The current value for scaled object validations.
- `keda_webhook_scaled_object_validation_errors` - The number of validation errors.

### Metrics Server

The KEDA Metrics Adapter exposes Prometheus metrics which can be scraped on port `8080` at `/metrics`. The following metrics are being gathered:

- `keda_internal_metricsservice_grpc_client_started_total` - Total number of RPCs started on the client.
- `keda_internal_metricsservice_grpc_client_handled_total` - Total number of RPCs completed by the client, regardless of success or failure.
- `keda_internal_metricsservice_grpc_client_msg_received_total` - Total number of RPC stream messages received by the client.
- `keda_internal_metricsservice_grpc_client_msg_sent_total` - Total number of gRPC stream messages sent by the client.
- `keda_internal_metricsservice_grpc_client_handling_seconds` - Histogram of response latency (seconds) of the gRPC until it is finished by the application.
- Metrics exposed by the `Operator SDK` framework as explained [here](https://sdk.operatorframework.io/docs/building-operators/golang/advanced-topics/#metrics).
- Metrics exposed (prepended with `apiserver_`) by [Kubernetes API Server](https://kubernetes.io/docs/reference/instrumentation/metrics/)

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
- scaledJob
- scaler
- metric
