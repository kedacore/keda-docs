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

KEDA does not provide full support for high-availability due to upstream limitations.

Here is an overview of all KEDA deployments and the HA notes:

| Deployment     | Support Replicas | Note                                                                                                                                                                                                                   |
| -------------- | ---------------- |---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Metrics Server | 1                | You can run multiple replicas of our metrics sever, and it is recommended to add the `--enable-aggregator-routing=true` CLI flag to the kube-apiserver so that requests sent to our metrics servers are load balanced. However, [you can only run one active metric server in a Kubernetes cluster serving external.metrics.k8s.io](https://github.com/kubernetes-sigs/custom-metrics-apiserver/issues/70) which has to be the KEDA metric server. |
| Operator       | 1                | While you can run multiple replicas of our operator, only one operator instance will be active. The rest will be standing by, which may reduce downtime during a failure. Multiple replicas will not improve the performance of KEDA, it could only reduce a downtime during a failover.<br /><br />This is only supported as of KEDA v2.6 if you are using our Helm chart. |
