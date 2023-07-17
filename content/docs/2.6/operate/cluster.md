+++
title = "Cluster"
description = "Guidance & requirements for running KEDA in your cluster"
weight = 100
+++

## Requirements

### Kubernetes

KEDA is designed, tested and supported to be run on any Kubernetes cluster that runs Kubernetes v1.17.0 or above until v1.25.0 (incl).

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

## Kubernetes Client Parameters

The Kubernetes client config used within KEDA Metrics Adapter can be adjusted by passing the following command-line flags to the binary:

| Adapter Flag   | Client Config Setting   | Default Value | Description                                                    | 
| -------------- | ----------------------- | ------------- | -------------------------------------------------------------- |
| kube-api-qps   | cfg.QPS                 | 20.0          | Set the QPS rate for throttling requests sent to the apiserver |
| kube-api-burst | cfg.Burst               | 30            | Set the burst for throttling requests sent to the apiserver    |

## Configure `MaxConcurrentReconciles` for Controllers

To implement internal controllers KEDA uses [controller-runtime project](https://github.com/kubernetes-sigs/controller-runtime), that enables configuration of [MaxConcurrentReconciles property](https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/controller#Options), ie. the maximum number of concurrent reconciles which can be run for a controller.

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

## Certificates used by KEDA Metrics Server

By default, KEDA Metrics Server uses self signed certificates while communicating with Kubernetes API Server. It is recommended to provide own (trusted) certificates instead.

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
