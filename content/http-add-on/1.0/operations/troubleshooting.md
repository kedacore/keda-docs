+++
title = "Troubleshooting"
description = "Request routing, queue state, and component performance troubleshooting"
+++

## Queue inspection

The interceptor exposes a `/queue` endpoint on its admin service (port `9090` by default) that returns the current pending request counts per route as JSON.

```shell
kubectl port-forward -n keda svc/keda-add-ons-http-interceptor-admin 9090
```

```shell
curl -X GET localhost:9090/queue
```

The response is a JSON object keyed by `namespace/route-name`, with concurrency and request count for each route:

```json
{
  "default/my-app": { "Concurrency": 3, "RequestCount": 42 },
  "demo/sample-app": { "Concurrency": 0, "RequestCount": 0 }
}
```

The endpoint shows raw counts from the interceptor.
Request rate (RPS) is calculated by the scaler component based on these counts and the configured window — it is not part of this response.

## Profiling

Enable pprof profiling on the interceptor or scaler by setting the `PROFILING_BIND_ADDRESS` environment variable:

```shell
helm upgrade http-add-on kedacore/keda-add-ons-http \
  --namespace keda \
  --set interceptor.extraEnvs.PROFILING_BIND_ADDRESS=0.0.0.0:6060
```

For the operator, use the `--profiling-bind-address` flag instead:

```shell
helm upgrade http-add-on kedacore/keda-add-ons-http \
  --namespace keda \
  --set operator.extraArgs.profiling-bind-address=:6060
```

Once enabled, collect profiles with `go tool pprof`:

```shell
kubectl port-forward -n keda deploy/keda-add-ons-http-interceptor 6060
go tool pprof -http=:8080 http://localhost:6060/debug/pprof/heap
```

## Getting Help

If you cannot resolve the issue, the following channels are available:

- [Kubernetes Slack](https://kubernetes.slack.com/archives/CKZJ36A5D) — `#keda` channel ([join here](https://slack.k8s.io))
- [GitHub Issues](https://github.com/kedacore/http-add-on/issues) — Bug reports and feature requests
- [GitHub Discussions](https://github.com/kedacore/http-add-on/discussions) — Questions and general conversation

## What's Next

- [Configure the Interceptor](../configure-interceptor/) — Timeouts, connection tuning, and scaling.
- [Environment Variables Reference](../../reference/environment-variables/) — all environment variables for each component.
- [Metrics Reference](../../reference/metrics/) — Prometheus metric definitions for monitoring.
