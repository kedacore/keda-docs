+++
title = "Caching Metrics"
weight = 600
+++

## Caching Metrics

This feature enables caching of metric values during polling interval (as specified in `.spec.pollingInterval`). Kubernetes (HPA controller) asks for a metric every few seconds (as defined by `--horizontal-pod-autoscaler-sync-period`, usually 15s), then this request is routed to KEDA Metrics Server, that by default queries the scaler and reads the metric values. Enabling this feature changes this behavior such that KEDA Metrics Server tries to read metric from the cache first. This cache is updated periodically during the polling interval.

Enabling this feature can significantly reduce the load on the scaler service.

This feature is not supported for `cpu`, `memory` or `cron` scaler.
