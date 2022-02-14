+++
title = "Cluster"
description = "Guidance & requirements for running KEDA in your cluster"
weight = 100
+++

## Requirements

### Kubernetes

KEDA is designed, tested and supported to be run on any Kubernetes cluster that runs Kubernetes v1.16.0 or above.

### Cluster Capacity

The KEDA runtime require the following resources in a production-ready setup:

| Deployment     | CPU                     | Memory                        |
|----------------|-------------------------|-------------------------------|
| Operator       | Limit: 1, Request: 100m | Limit: 1000Mi, Request: 100Mi |
| Metrics Server | Limit: 1, Request: 100m | Limit: 1000Mi, Request: 100Mi |

These are used by default when deploying through YAML.

> 💡 For more info on CPU and Memory resource units and their meaning, see [this](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#resource-units-in-kubernetes) link.

### Firewall

KEDA requires to be accessible inside the cluster to be able to autoscale.

Here is an overview of the required ports that need to be accessible for KEDA to work:

| Port   | Why?                                         | Remarks                                              |
| ------ | -------------------------------------------- | ---------------------------------------------------- |
| `443`  | Used by Kubernetes API server to get metrics | Required for all platforms, except for Google Cloud. |
| `6443` | Used by Kubernetes API server to get metrics | Only required for Google Cloud                       |

## High Availability

KEDA does not provide support for high-availability due to upstream limitations.

Here is an overview of all KEDA deployments and the supported replicas:

| Deployment     | Support Replicas        | Reasoning                     |
|----------------|-------------------------|-------------------------------|
| Operator       | 1                       |                               |
| Metrics Server | 1                       | Limitation in [k8s custom metrics server](https://github.com/kubernetes-sigs/custom-metrics-apiserver/issues/70) |