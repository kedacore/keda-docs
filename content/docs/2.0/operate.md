+++
title = "Operate"
+++

## Prometheus Exporter Metrics

The KEDA Metrics Adapter exposes Prometheus metrics which can be scraped on port `9022` (this can be changed by setting the `metrics-port` argument for the Metrics Adapter) at `/metrics`.  The metrics collected in the Metrics Adapter are only active when the HPA is active (> 0 replicas).

The following metrics are being gathered:

- `keda_metrics_adapter_scaler_error_totals` - The total number of errors encountered for all scalers
- `keda_metrics_adapter_scaled_object_error_totals`- The number of errors that have occurred for each scaled object
- `keda_metrics_adapter_scaler_errors` - The number of errors that have occurred for each scaler
- `keda_metrics_adapter_scaler_metrics_value`- The current value for each scaler's metric that would be used by the HPA in computing the target average.

## HTTP Timeouts

Some scalers issue HTTP requests to external servers (i.e. cloud services). Each applicable scaler uses its own dedicated HTTP client with its own connection pool, and by default each client is set to time out any HTTP request after 3 seconds. 

You can override this default by setting the `KEDA_HTTP_DEFAULT_TIMEOUT` environment variable to your desired timeout in milliseconds. For example, on Linux/Mac/Windows WSL2 operating systems, you'd use this command to set to 1 second:

```shell
export KEDA_HTTP_DEFAULT_TIMEOUT=1000
```

And on Windows Powershell, you'd use this command:

```shell
$env:KEDA_HTTP_DEFAULT_TIMEOUT=1000
```

All applicable scalers will use this timeout. Setting a per-scaler timeout is currently unsupported.
