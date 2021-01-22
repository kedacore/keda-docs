+++
title = "Cluster"
description = "Guidance & requirements for running KEDA in your cluster"
weight = 100
+++

## High Availability

KEDA does not provide support for high-availability due to upstream limitations.

Here is an overview of all KEDA deployments and the supported replicas:

| Deployment     | Support Replicas        | Reasoning                     |
|----------------|-------------------------|-------------------------------|
| Operator       | 1                       |                               |
| Metrics Server | 1                       | Limitation in [k8s custom metrics server](https://github.com/kubernetes-sigs/custom-metrics-apiserver/issues/70) |

## Cluster capacity requirements

The KEDA runtime require the following resources in a production-ready setup:

| Deployment     | CPU                     | Memory                        |
|----------------|-------------------------|-------------------------------|
| Operator       | Limit: 1, Request: 100m | Limit: 1000Mi, Request: 100Mi |
| Metrics Server | Limit: 1, Request: 100m | Limit: 1000Mi, Request: 100Mi |

These are used by default when deploying through YAML.

> 💡 For more info on CPU and Memory resource units and their meaning, see [this](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#resource-units-in-kubernetes) link.

## High Availability

KEDA does not provide support for high-availability due to upstream limitations.

Here is an overview of all KEDA deployments and the supported replicas:

| Deployment     | Support Replicas        | Reasoning                     |
|----------------|-------------------------|-------------------------------|
| Operator       | 1                       |                               |
| Metrics Server | 1                       | Limitation in [k8s custom metrics server](https://github.com/kubernetes-sigs/custom-metrics-apiserver/issues/70) |

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
