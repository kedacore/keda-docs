+++
title = "Operate"
+++

## High Availability

TBW 

| Deployment     | Support Replicas        | Reasoning                     |
|----------------|-------------------------|-------------------------------|
| Operator       | 1                       |                               |
| Metrics Server | 1                       | Limitation in [k8s custom metrics server](https://github.com/kubernetes-sigs/custom-metrics-apiserver/issues/70) |

> it doesn’t have much sense to add more operators though
> 18:56
> the other thing is to tweak MaxConcurrentReconciles , currently set to 1
> https://sdk.operatorframework.io/docs/building-operators/golang/tutorial/#controller-configurations > (edited)
> 18:57
> currently there’s no way how to modify that expect the code (exposing some env should be trivial)
> 18:57
> but since we don’t have much metrics and data, I am not sure whether increasing this would have an > impact
> 18:57
> so that’s why I haven’t check this area so far
> 18:58
> the other point is, that it is untested (its basically introducing concurrency in the code)
> 18:58
> but it should give perf boost for larger setups

## Cluster capacity requirements

The KEDA runtime require the following resources in a production-ready setup:

| Deployment     | CPU                     | Memory                        |
|----------------|-------------------------|-------------------------------|
| Operator       | Limit: 1, Request: 100m | Limit: 1000Mi, Request: 100Mi |
| Metrics Server | Limit: 1, Request: 100m | Limit: 1000Mi, Request: 100Mi |

These are used by default when deploying through YAML.

> 💡 For more info on CPU and Memory resource units and their meaning, see [this](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#resource-units-in-kubernetes) link.

## Prometheus Exporter Metrics

The KEDA Metrics Adapter exposes Prometheus metrics which can be scraped on port `9022` (this can be changed by setting the `metrics-port` argument for the Metrics Adapter) at `/metrics`.  The metrics collected in the Metrics Adapter are only active when the HPA is active (> 0 replicas).

The following metrics are being gathered:

- `keda_metrics_adapter_scaler_error_totals` - The total number of errors encountered for all scalers
- `keda_metrics_adapter_scaled_object_error_totals`- The number of errors that have occurred for each scaled object
- `keda_metrics_adapter_scaler_errors` - The number of errors that have occurred for each scaler
- `keda_metrics_adapter_scaler_metrics_value`- The current value for each scaler's metric that would be used by the HPA in computing the target average.
