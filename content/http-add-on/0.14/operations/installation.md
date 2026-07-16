+++
title = "Install the HTTP Add-on"
description = "HTTP Add-on installation, upgrade, and removal via Helm"
weight = 1
+++

## Prerequisites

Before installing the HTTP Add-on, ensure you have:

- A Kubernetes cluster (tested against the three most recent minor versions)
- [Helm 3](https://helm.sh/docs/intro/install/)
- KEDA core installed ([deployment guide](https://keda.sh/docs/deploy/))

If you have not installed KEDA yet, run:

```shell
helm repo add kedacore https://kedacore.github.io/charts
helm repo update
helm install keda kedacore/keda --namespace keda --create-namespace
```

## Install

1. Add the KEDA Helm repository (if you have not already):

   ```shell
   helm repo add kedacore https://kedacore.github.io/charts
   helm repo update
   ```

2. Install the HTTP Add-on into the same namespace as KEDA:

   ```shell
   helm install http-add-on kedacore/keda-add-ons-http --namespace keda
   ```

3. Verify the installation:

   ```shell
   kubectl get pods -n keda
   ```

   You should see pods for the operator, interceptor, and scaler components in a `Running` state.

### Helm Values to Consider

The following values are commonly configured at install time.
Pass them with `--set` or in a values file (`-f values.yaml`).

| Value                      | Description                                                                       | Default |
| -------------------------- | --------------------------------------------------------------------------------- | ------- |
| `interceptor.replicas.min` | Minimum number of interceptor replicas                                            | `3`     |
| `interceptor.replicas.max` | Maximum number of interceptor replicas                                            | `50`    |
| `operator.watchNamespace`  | Restrict the operator to a single namespace (empty string watches all namespaces) | `""`    |

For the full list of configuration options, see the [http-add-on chart](https://github.com/kedacore/charts/tree/main/http-add-on#configuration).

## Upgrade

To upgrade to a newer version of the HTTP Add-on:

```shell
helm repo update
helm upgrade http-add-on kedacore/keda-add-ons-http --namespace keda
```

The CRDs are included as Helm templates (not in the `crds/` directory), so they are updated automatically during `helm upgrade`.

## Uninstall

1. Remove the HTTP Add-on Helm release:

   ```shell
   helm uninstall http-add-on --namespace keda
   ```

2. CRDs are **not** automatically removed on uninstall. To remove them manually:

   ```shell
   kubectl delete crd httpscaledobjects.http.keda.sh interceptorroutes.http.keda.sh
   ```

   > **Warning:** Deleting the CRDs removes all `HTTPScaledObject` and `InterceptorRoute` resources in the cluster. Make sure you no longer need them before proceeding.

## Namespace-Scoped Installation

By default, the operator watches all namespaces for `HTTPScaledObject` and `InterceptorRoute` resources.
To restrict the operator to a single namespace:

```shell
helm install http-add-on kedacore/keda-add-ons-http \
  --namespace keda \
  --set operator.watchNamespace=<your-namespace>
```

For the full list of configuration options, see the [http-add-on chart](https://github.com/kedacore/charts/tree/main/http-add-on#configuration).

## What's Next

- [Autoscale an App](../../user-guide/autoscale-an-app/) — Create a ScaledObject and InterceptorRoute for your service.
- [Configure the Interceptor](../configure-interceptor/) — Timeouts, connection tuning, and scaling.
