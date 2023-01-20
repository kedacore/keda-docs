+++
title = "Why is Kubernetes unable to get metrics from KEDA?"
weight = 1
+++

If while setting up KEDA, you get an error: `(v1beta1.external.metrics.k8s.io) status FailedDiscoveryCheck` with a message: `no response from https://ip:443: Get https://ip:443: net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)`.

 One of the reason for this can be that you are behind a proxy network.

### Before you start

- Make sure no network policies are blocking traffic

### Check the status

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

If the status is `False`, then there seems to be an issue and proxy network might be the primary reason for it.

### Solution for self-managed Kubernetes cluster

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

### Solution for managed Kubernetes services

In managed Kubernetes services you might solve the issue by updating firewall rules in your cluster.

#### GKE

E.g. in GKE private cluster [add](https://cloud.google.com/kubernetes-engine/docs/how-to/private-clusters#add_firewall_rules) port 6443 (kube-apiserver) to allowed ports in master node firewall rules.

#### EKS

E.g. Make sure the Cluster Security group can reach the Nodegroups on TCP 6443. For example, using the [terraform eks module](https://registry.terraform.io/modules/terraform-aws-modules/eks/aws/latest), this is achievable through the addtional nodegroup rules

```terraform
module "eks" {
  source                               = "terraform-aws-modules/eks/aws"
  version                              = "19.5.1"
  ...
  create_node_security_group = true
  node_security_group_additional_rules = {
    keda_metrics_server_access = {
      description                   = "Cluster access to keda metrics"
      protocol                      = "tcp"
      from_port                     = 6443
      to_port                       = 6443
      type                          = "ingress"
      source_cluster_security_group = true
    }
  }
```
