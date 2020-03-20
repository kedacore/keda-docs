+++
title = "Deploying KEDA"
+++

We provide a few approaches to deploy KEDA runtime in your Kubernetes clusters:

- Helm charts
- YAML declarations

Don't see what you need? Feel free to [create an issue](https://github.com/kedacore/keda/issues/new) on our GitHub repo.

## Deploying with Helm {#helm}

Deploying KEDA with Helm is very simple:

1. Add Helm repo

    ```cli
    helm repo add kedacore https://kedacore.github.io/charts
    ```

2. Update Helm repo
    ```cli
    helm repo update
    ```

3. Install `keda` Helm chart

    **Helm 2**

    ```cli
    helm install kedacore/keda --namespace keda --name keda
    ```

    **Helm 3**

    ```cli
    kubectl create namespace keda
    helm install keda kedacore/keda --namespace keda
    ```

### Deploying using the deploy yaml

If you want to try KEDA on minikube or a different Kubernetes deployment without using Helm you can still deploy it with `kubectl`.

We provide sample YAML declarations which includes our CRD - You can find them in our `/deploy` directory on our [GitHub repo](https://github.com/kedacore/keda).

```
kubectl apply -f deploy/crds/keda.k8s.io_scaledobjects_crd.yaml
kubectl apply -f deploy/crds/keda.k8s.io_triggerauthentications_crd.yaml
kubectl apply -f deploy/
```

## Uninstalling KEDA

If you want to remove KEDA from a cluster you can run one of the following:

### Using Helm 3

```cli
helm uninstall -n keda keda
kubectl delete -f https://raw.githubusercontent.com/kedacore/keda/master/deploy/crds/keda.k8s.io_scaledobjects_crd.yaml
kubectl delete -f https://raw.githubusercontent.com/kedacore/keda/master/deploy/crds/keda.k8s.io_triggerauthentications_crd.yaml
```

### Using Helm 2

```cli
helm delete --purge keda
kubectl delete -f https://raw.githubusercontent.com/kedacore/keda/master/deploy/crds/keda.k8s.io_scaledobjects_crd.yaml
kubectl delete -f https://raw.githubusercontent.com/kedacore/keda/master/deploy/crds/keda.k8s.io_triggerauthentications_crd.yaml
```

### Using YAML

You would need to run these commands from within the directory of the cloned [GitHub repo](https://github.com/kedacore/keda)

```cli
kubectl delete -f deploy/crds/keda.k8s.io_scaledobjects_crd.yaml
kubectl delete -f deploy/crds/keda.k8s.io_triggerauthentications_crd.yaml
kubectl delete -f deploy/
```
