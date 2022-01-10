+++
title = "Why is KEDA API metrics server failing when Istio is installed?"
+++

While setting up KEDA, you get an error: `(v1beta1.external.metrics.k8s.io) status FailedDiscoveryCheck` and you have [Istio](https://istio.io/) installed as service mesh in your cluster.

This can lead to side effects like not being able to delete namespaces in your cluster. You will see an error like:

`NamespaceDeletionDiscoveryFailure - Discovery failed for some groups, 1 failing: unable to retrieve the complete list of server APIs: external.metrics.k8s.io/v1beta1: the server is currently unable to handle the request`

### Check the setup

In the following we assume that KEDA is installed in the namespace `keda`.

#### Check the KEDA API service status

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

If the status is `False`, then there seems to be an issue with the KEDA installation.

#### Check Istio installation

Check if Istio is installed in your cluster:

```sh
kubectl get svc -n istio-system
```

If Istio is installed you get a result like:

```sh
NAME                   TYPE           CLUSTER-IP       EXTERNAL-IP     PORT(S)                                      AGE
istio-ingressgateway   LoadBalancer   100.65.18.245    34.159.50.243   15021:31585/TCP,80:31669/TCP,443:30464/TCP   3d
istiod                 ClusterIP      100.65.146.141   <none>          15010/TCP,15012/TCP,443/TCP,15014/TCP        3d
```

#### Check KEDA namespace labels

Check the KEDA namespace labels:

```sh
kubectl describe ns keda
```

If Istio injection is enabled there is **no** label stating `istio-injection=disabled`.

In this setup the sidecar injection of Istio prevents the api service of KEDA to work properly.

### Solution

To prevent the side-car injection of Istio we must label the namespace accordingly. This can be achieved via setting the label `istio-injection=disabled` to the namespace:

```sh
kubectl label namespace keda istio-injection=disabled
```

Check that the label is set via `kubectl describe ns keda`

Install KEDA into the namespace `keda` and re-check the status of the api service which should now have the status `True`.
