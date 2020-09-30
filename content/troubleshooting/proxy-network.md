+++
title = "How can I use KEDA in a proxy network?"
weight = 1
+++

If while setting up KEDA, you get an error: `(v1beta1.external.metrics.k8s.io) status FailedDiscoveryCheck` with a message: `no response from https://ip:443: Get https://ip:443: net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)`.

 One of the reason for this can be that you are behind a proxy network.

### Check the status:

Find the api service name for the service `keda/keda-metrics-apiserver`:

```sh
kubectl get apiservice --all-namespaces
```

Check for the status of the api service found in previous step:

```sh
kubectl get apiservice <apiservicename' -o yaml
```

Example:

```sh
kubectl get apiservice v1beta1.external.metrics.k8s.io -o yaml
```

If the status is `False`, then there seems to be an issue and proxy network might be the primary reason for it.

### Solution for self-managed Kubernetes cluster:

Find the cluster IP for the `keda-metrics-apiserver` and `keda-operator-metrics`:

```sh
kubectl get services --all-namespaces
```

In the `/etc/kubernetes/manifests/kube-apiserver.yaml` - add the cluster IPs found in the previous step in no_proxy variable.

Reload systemd manager configuration:

```sh
sudo systemctl daemon-reload
```

Restart kubelet:

```sh
sudo systemctl restart kubelet
```

Check the API service status and the pods now. Should work!

### Solution for managed Kubernetes services:

In managed Kubernetes services you might solve the issue by updating firewall rules in your cluster. 

E.g. in GKE private cluster [add](https://cloud.google.com/kubernetes-engine/docs/how-to/private-clusters#add_firewall_rules) port 6443 (kube-apiserver) to allowed ports in master node firewall rules.
