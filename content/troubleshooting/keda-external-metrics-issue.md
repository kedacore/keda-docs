+++
title = "Kubernetes Control plane is unable to communicate to Metric server?"
weight = 1
+++

If while setting up KEDA, you get an error: `(v1beta1.external.metrics.k8s.io) status FailedDiscoveryCheck` with a message: `failing or missing response from https://POD-IP:6443/apis/external.metrics.k8s.io/v1beta1: Get "https://POD-IP:6443/apis/external.metrics.k8s.io/v1beta1": Address is not allowed`.

 One of the reason for this can be due to CNI like Cilium or any other.

### Before you start

- Make sure no network policies are blocking traffic and required CIDR's are added

### Check the status:

Find the api service name for the service `keda/keda-metrics-apiserver`:

```sh
kubectl get apiservice --all-namespaces
```

Check for the status of the api service found in previous step:

```sh
kubectl get apiservice <apiservicename> -o yaml
```

Example:

```sh
kubectl get apiservice v1beta1.external.metrics.k8s.io -o yaml
```

If the status is `False`, then there seems to be an issue and network might be the primary reason for it.


### Solution for managed Kubernetes services:

In managed Kubernetes services you might solve the issue by updating deployment file of metric-apiserver

Make sure these are present in deployment file.
```sh
    dnsPolicy: ClusterFirst
    hostNetwork: true
```
