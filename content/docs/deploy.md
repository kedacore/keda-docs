+++
title = "Deploying KEDA"
+++

We provide a few approaches to deploy KEDA runtime in your Kubernetes clusters:

- [Helm charts](#helm)
- [Operator Hub](#operatorhub)
- [YAML declarations](#yaml)

Don't see what you need? Feel free to [create an issue](https://github.com/kedacore/keda/issues/new) on our GitHub repo.

## Deploying with Helm {#helm}

Deploying KEDA with Helm is very simple:

1. Add Helm repo

    ```sh
    helm repo add kedacore https://kedacore.github.io/charts
    ```

2. Update Helm repo

    ```sh
    helm repo update
    ```

3. Install `keda` Helm chart

    **Helm 2**

    ```sh
    helm install kedacore/keda --namespace keda --name keda
    ```

    **Helm 3**

    ```sh
    kubectl create namespace keda
    helm install keda kedacore/keda --namespace keda
    ```

## Deploying with Operator Hub {#operatorhub}

1. On Operator Hub Marketplace locate and install KEDA operator
2. Create namespace `keda`
3. Create `KedaController` resource in `keda` namespace
![Operator Hub installation](https://raw.githubusercontent.com/kedacore/keda-olm-operator/master/images/keda-olm-install.gif)
> Note: Further information on Operator Hub installation method can be found in the following [repository](https://github.com/kedacore/keda-olm-operator).

## Deploying using the deployment YAML files {#yaml}

If you want to try KEDA on [Minikube](https://minikube.sigs.k8s.io) or a different Kubernetes deployment without using Helm you can still deploy it with `kubectl`.

We provide sample YAML declarations which includes our CRD - You can find them in our `/deploy` directory on our [GitHub repo](https://github.com/kedacore/keda).

```sh
git clone https://github.com/kedacore/keda && cd keda

kubectl apply -f deploy/crds/keda.k8s.io_scaledobjects_crd.yaml
kubectl apply -f deploy/crds/keda.k8s.io_triggerauthentications_crd.yaml
kubectl apply -f deploy/
```

## Uninstalling KEDA

If you want to remove KEDA from a cluster you can run one of the following:

### Using Helm 3

```sh
helm uninstall -n keda keda
kubectl delete -f https://raw.githubusercontent.com/kedacore/keda/master/deploy/crds/keda.k8s.io_scaledobjects_crd.yaml
kubectl delete -f https://raw.githubusercontent.com/kedacore/keda/master/deploy/crds/keda.k8s.io_triggerauthentications_crd.yaml
```

### Using Helm 2

```sh
helm delete --purge keda
kubectl delete -f https://raw.githubusercontent.com/kedacore/keda/master/deploy/crds/keda.k8s.io_scaledobjects_crd.yaml
kubectl delete -f https://raw.githubusercontent.com/kedacore/keda/master/deploy/crds/keda.k8s.io_triggerauthentications_crd.yaml
```

### Using Operator Hub
Locate installed KEDA Operator in `keda` namespace, then remove created `KedaController` resource and uninstall KEDA operator.

### Using YAML

You would need to run these commands from within the directory of the cloned [GitHub repo](https://github.com/kedacore/keda):

```sh
kubectl delete -f deploy/crds/keda.k8s.io_scaledobjects_crd.yaml
kubectl delete -f deploy/crds/keda.k8s.io_triggerauthentications_crd.yaml
kubectl delete -f deploy/
```
