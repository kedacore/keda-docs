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

|   KEDA    |   Kubernetes  |
|-----------|---------------|
|   v2.9    | v1.23 - v1.25 |
|   v2.8    | v1.17 - v1.25 |
|   v2.7    | v1.17 - v1.25 |

### Cluster Capacity

The KEDA runtime require the following resources in a production-ready setup:

| Deployment     | CPU                     | Memory                        |
| -------------- | ----------------------- | ----------------------------- |
| Metrics Server | Limit: 1, Request: 100m | Limit: 1000Mi, Request: 100Mi |
| Operator       | Limit: 1, Request: 100m | Limit: 1000Mi, Request: 100Mi |

These are used by default when deploying through YAML.

> 💡 For more info on CPU and Memory resource units and their meaning, see [this](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#resource-units-in-kubernetes) link.

### Firewall

KEDA requires to be accessible inside the cluster to be able to autoscale.

Here is an overview of the required ports that need to be accessible for KEDA to work:

<!-- markdownlint-disable no-inline-html -->
| Port   | Why?                                         | Remarks                                                                                                                                                   |
| ------ | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `443`  | Used by Kubernetes API server to get metrics | Required for all platforms because it uses Control Plane &#8594; port 443 on the Service IP range communication.<br /><br /> This is not applicable for Google Cloud. |
| `6443` | Used by Kubernetes API server to get metrics | Only required for Google Cloud because it uses Control Plane &#8594; port 6443 on the Pod IP range for communication                                      |
<!-- markdownlint-enable no-inline-html -->

## High Availability

KEDA does not provide full support for high-availability due to upstream limitations.

Here is an overview of all KEDA deployments and the HA notes:

| Deployment     | Support Replicas | Note                                                                                                                                                                                                                   |
| -------------- | ---------------- |---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Metrics Server | 1                | You can run multiple replicas of our metrics sever, and it is recommended to add the `--enable-aggregator-routing=true` CLI flag to the kube-apiserver so that requests sent to our metrics servers are load balanced. However, [you can only run one active metric server in a Kubernetes cluster serving external.metrics.k8s.io](https://github.com/kubernetes-sigs/custom-metrics-apiserver/issues/70) which has to be the KEDA metric server. |
| Operator       | 2                | While you can run multiple replicas of our operator, only one operator instance will be active. The rest will be standing by, which may reduce downtime during a failure. Multiple replicas will not improve the performance of KEDA, it could only reduce a downtime during a failover. |

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

## Kubernetes Client Parameters

The Kubernetes client config used within KEDA Operator and KEDA Metrics Adapter can be adjusted by passing the following command-line flags to the binary:

|     Adapter Flag    | Client Config Setting   | Default Value | Description                                                    |
| ------------------- | ----------------------- | ------------- | -------------------------------------------------------------- |
| kube-api-qps        | cfg.QPS                 | 20.0          | Set the QPS rate for throttling requests sent to the apiserver |
| kube-api-burst      | cfg.Burst               | 30            | Set the burst for throttling requests sent to the apiserver    |
| disable-compression | cfg.DisableCompression  | true          | Disable compression for response in k8s restAPI in client-go, see [this Kubernetes issue](https://github.com/kubernetes/kubernetes/issues/112296) for details |

## Configure `MaxConcurrentReconciles` for Controllers

To implement internal controllers KEDA uses the [controller-runtime project](https://github.com/kubernetes-sigs/controller-runtime), that enables configuration of [MaxConcurrentReconciles property](https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/controller#Options), ie. the maximum number of concurrent reconciles which can be run for a controller.

KEDA Operator exposes properties for specifying `MaxConcurrentReconciles` for following controllers/reconcilers:
- `ScaledObjectReconciler` - responsible for watching and managing `ScaledObjects`, ie. validates input trigger specification, starts scaling logic and manages dependent HPA.
- `ScaledJobReconciler` - responsible for watching and managing `ScaledJobs` and dependent Kubernetes Jobs

KEDA Metrics Server exposes property for specifying `MaxConcurrentReconciles` for `MetricsScaledObjectReconciler`, that manages Metrics Names exposes by KEDA and which are being consumed by Kubernetes server and HPA controller.

To modify this properties you can set environment variables on both KEDA Operator and Metrics Server Deployments:

| Environment variable name             | Deployment     | Default Value | Affected reconciler                                            |
| ------------------------------------- | -------------- | ------------- | -------------------------------------------------------------- |
| KEDA_SCALEDOBJECT_CTRL_MAX_RECONCILES | Operator       | 5             | ScaledObjectReconciler                                         |
| KEDA_SCALEDJOB_CTRL_MAX_RECONCILES    | Operator       | 1             | ScaledJobReconciler                                            |
| KEDA_METRICS_CTRL_MAX_RECONCILES      | Metrics Server | 1             | MetricsScaledObjectReconciler                                  |

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

By default KEDA Metrics Server uses self-signed certificates while communicating with Kubernetes API Server. It is recommended to provide own (trusted) certificates instead.

Certificates and CA bundle can be referenced in `args` section in KEDA Metrics Server Deployment:

```yaml
...
args:
  - '--client-ca-file=/cabundle/service-ca.crt'
  - '--tls-cert-file=/certs/tls.crt'
  - '--tls-private-key-file=/certs/tls.key'
...
```

The custom CA bundle should be also referenced in the `v1beta1.external.metrics.k8s.io` [APIService](https://kubernetes.io/docs/reference/kubernetes-api/cluster-resources/api-service-v1/#APIServiceSpec) resource (which is created during the installation of KEDA). 

You should also make sure that `insecureSkipTLSVerify` is not set to `true`.

```yaml
...
spec:
  service:
    namespace: keda
    name: keda-metrics-apiserver
    port: 443
  group: external.metrics.k8s.io
  version: v1beta1
  caBundle: >-
    YOURCABUNDLE...
  groupPriorityMinimum: 100
  versionPriority: 100
...
```

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
