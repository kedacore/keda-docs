+++
title = "Cluster"
description = "Guidance & requirements for running KEDA in your cluster"
weight = 100
+++

## Requirements

### Kubernetes Compatibility

The supported window of Kubernetes versions with KEDA is known as "N-2" which means that KEDA will provide support for running on N-2 at least.

However, maintainers can decide to extend this by supporting more minor versions based on the required CRDs being used; but there is no guarantee.

As a reference, this compatibility matrix shows supported k8s versions per KEDA version:

| KEDA  | Kubernetes    |
| ----- | ------------- |
| v2.11 | v1.25 - v1.27 |
| v2.10 | v1.24 - v1.26 |
| v2.9  | v1.23 - v1.25 |
| v2.8  | v1.17 - v1.25 |
| v2.7  | v1.17 - v1.25 |

### Cluster Capacity

The KEDA runtime require the following resources in a production-ready setup:

| Deployment         | CPU                     | Memory                        |
| ------------------ | ----------------------- | ----------------------------- |
| Admission Webhooks | Limit: 1, Request: 100m | Limit: 1000Mi, Request: 100Mi |
| Metrics Server     | Limit: 1, Request: 100m | Limit: 1000Mi, Request: 100Mi |
| Operator           | Limit: 1, Request: 100m | Limit: 1000Mi, Request: 100Mi |

These are used by default when deploying through YAML.

> 💡 For more info on CPU and Memory resource units and their meaning, see [this](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#resource-units-in-kubernetes) link.

### Firewall

KEDA requires to be accessible inside the cluster to be able to autoscale.

Here is an overview of the required ports that need to be accessible for KEDA to work:

| Port   | Why?                                         | Remarks                                                                                                                                                   |
| ------ | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `443`  | Used by Kubernetes API server to get metrics | Required for all platforms because it uses Control Plane &#8594; port 443 on the Service IP range communication. This is not applicable for Google Cloud. |
| `6443` | Used by Kubernetes API server to get metrics | Only required for Google Cloud because it uses Control Plane &#8594; port 6443 on the Pod IP range for communication                                      |

## High Availability

KEDA does not provide full support for high-availability due to upstream limitations.

Here is an overview of all KEDA deployments and the HA notes:

| Deployment     | Support Replicas | Note                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Metrics Server | 1                | You can run multiple replicas of our metrics sever, and it is recommended to add the `--enable-aggregator-routing=true` CLI flag to the kube-apiserver so that requests sent to our metrics servers are load balanced. However, [you can only run one active metric server in a Kubernetes cluster serving external.metrics.k8s.io](https://github.com/kubernetes-sigs/custom-metrics-apiserver/issues/70) which has to be the KEDA metric server. |
| Operator       | 2                | While you can run multiple replicas of our operator, only one operator instance will be active. The rest will be standing by, which may reduce downtime during a failure. Multiple replicas will not improve the performance of KEDA, it could only reduce a downtime during a failover.                                                                                                                                                           |

## HTTP Timeouts

Some scalers issue HTTP requests to external servers (i.e. cloud services). Each applicable scaler uses its own dedicated HTTP client with its own connection pool, and by default each client is set to time out any HTTP request after 3 seconds.

You can override this default by setting the `KEDA_HTTP_DEFAULT_TIMEOUT` environment variable on the KEDA operator deployment to your desired timeout in milliseconds.

> ⚠️ All applicable scalers will use this timeout and setting this on a per-scaler is currently not supported.

## HTTP connection disable keep alive

Keep alive behaviour is enabled by default for every HTTP connection, this could stack a huge amount of connections (one per scaler) in some scenarios.

You can disable keep alive for every HTTP connection by adding the relevant environment variable to both the KEDA Operator, and KEDA Metrics Server deployments:

```yaml
- env:
    KEDA_HTTP_DISABLE_KEEP_ALIVE: true
```

All applicable scalers will use this keep alive behaviour. Setting a per-scaler keep alive behaviour is currently unsupported.

## HTTP Proxies

Some scalers issue HTTP requests to external servers (i.e. cloud services). As certain companies require external servers to be accessed by proxy servers, adding the relevant environment variables to both the KEDA Operator, and KEDA Metrics Server deployments (HTTP_PROXY, HTTPS_PROXY, NO_PROXY, etc.) would allow the scaler to connect via the desired proxy.

```yaml
- env:
    HTTP_PROXY: http://proxy.server:port
    HTTPS_PROXY: http://proxy.server:port
    NO_PROXY: 10.0.0.0/8
```

## HTTP TLS min version

Our industry has seen an evolution of TLS versions and some are more secure than another. For example, TLS1.0 and TLS1.1 have known vulnerabilities.

By default, KEDA uses TLS1.2 as a minimum TLS version given it is the lowest version without vulnerabilities. However, if you need to support another version you can configure it by using the environment variable `KEDA_HTTP_MIN_TLS_VERSION`.

For example:

```yaml
- env:
    KEDA_HTTP_MIN_TLS_VERSION: TLS13
```

The following values are allowed: `TLS13`, `TLS12`, `TLS11` and `TLS10`.

## Kubernetes Client Parameters

The Kubernetes client config used within KEDA Operator and KEDA Metrics Adapter can be adjusted by passing the following command-line flags to the binary:

| Adapter Flag        | Client Config Setting  | Default Value | Description                                                                                                                                                   |
| ------------------- | ---------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| kube-api-qps        | cfg.QPS                | 20.0          | Set the QPS rate for throttling requests sent to the apiserver                                                                                                |
| kube-api-burst      | cfg.Burst              | 30            | Set the burst for throttling requests sent to the apiserver                                                                                                   |
| disable-compression | cfg.DisableCompression | true          | Disable compression for response in k8s restAPI in client-go, see [this Kubernetes issue](https://github.com/kubernetes/kubernetes/issues/112296) for details |

## Configure `MaxConcurrentReconciles` for Controllers

To implement internal controllers KEDA uses the [controller-runtime project](https://github.com/kubernetes-sigs/controller-runtime), that enables configuration of [MaxConcurrentReconciles property](https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/controller#Options), ie. the maximum number of concurrent reconciles which can be run for a controller.

KEDA Operator exposes properties for specifying `MaxConcurrentReconciles` for following controllers/reconcilers:

- `ScaledObjectReconciler` - responsible for watching and managing `ScaledObjects`, ie. validates input trigger specification, starts scaling logic and manages dependent HPA.
- `ScaledJobReconciler` - responsible for watching and managing `ScaledJobs` and dependent Kubernetes Jobs

KEDA Metrics Server exposes property for specifying `MaxConcurrentReconciles` for `MetricsScaledObjectReconciler`, that manages Metrics Names exposes by KEDA and which are being consumed by Kubernetes server and HPA controller.

To modify this properties you can set environment variables on both KEDA Operator and Metrics Server Deployments:

| Environment variable name             | Deployment | Default Value | Affected reconciler    |
| ------------------------------------- | ---------- | ------------- | ---------------------- |
| KEDA_SCALEDOBJECT_CTRL_MAX_RECONCILES | Operator   | 5             | ScaledObjectReconciler |
| KEDA_SCALEDJOB_CTRL_MAX_RECONCILES    | Operator   | 1             | ScaledJobReconciler    |

## Configure Leader Election

Like reconciliation, KEDA also uses the [controller-runtime project](https://github.com/kubernetes-sigs/controller-runtime) for electing the leader replica. The following properties can be configured for either the Operator and Metrics Server Deployment:

- [`LeaseDuration`](https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/manager#Options.LeaseDuration)
- [`RenewDeadline`](https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/manager#Options.RenewDeadline)
- [`RetryPeriod`](https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/manager#Options.RetryPeriod)

To specify values other than their defaults, you can set the following environment variables:

| Environment variable name                    | Deployment     | Default Value | Manager Property |
| -------------------------------------------- | -------------- | ------------- | ---------------- |
| KEDA_OPERATOR_LEADER_ELECTION_LEASE_DURATION | Operator       | 15s           | LeaseDuration    |
| KEDA_OPERATOR_LEADER_ELECTION_RENEW_DEADLINE | Operator       | 10s           | RenewDeadline    |
| KEDA_OPERATOR_LEADER_ELECTION_RETRY_PERIOD   | Operator       | 2s            | RetryPeriod      |
| KEDA_METRICS_LEADER_ELECTION_LEASE_DURATION  | Metrics Server | 15s           | LeaseDuration    |
| KEDA_METRICS_LEADER_ELECTION_RENEW_DEADLINE  | Metrics Server | 10s           | RenewDeadline    |
| KEDA_METRICS_LEADER_ELECTION_RETRY_PERIOD    | Metrics Server | 2s            | RetryPeriod      |

## Certificates used by KEDA Metrics Server

To learn more please refer to [security section](./security#use-your-own-tls-certificates)

## Restrict Secret Access

By default, KEDA requires adding `secrets` to the cluster role as following:

```yaml
- apiGroups:
    - ""
  resources:
    - external
    - pods
    - secrets
    - services
  verbs:
    - get
    - list
    - watch
```

However, this might lead to security risk (especially in production environment) since it will grant permission to read `secrets` from all namespaces.

To restrict `secret` access and limited to KEDA namespace, you could add `KEDA_RESTRICT_SECRET_ACCESS` as environment variable to both KEDA Operator and KEDA Metrics Server:

```yaml
env:
  - name: KEDA_RESTRICT_SECRET_ACCESS
    value: "true"
```

This allows you to omit `secrets` from the cluster role, which will disallow `TriggerAuthentication` to be used for your triggers if the `TriggerAuthentication` is using secrets. You can, however, still use `ClusterTriggerAuthentication`.
