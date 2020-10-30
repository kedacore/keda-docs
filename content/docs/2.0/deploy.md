+++
title = "Deploying KEDA"
+++

We provide a few approaches to deploy KEDA runtime in your Kubernetes clusters:

- [Helm charts](#helm)
- [Operator Hub](#operatorhub)
- [YAML declarations](#yaml)

> 💡 **NOTE:** KEDA requires Kubernetes cluster version 1.16 and higher

Don't see what you need? Feel free to [create an issue](https://github.com/kedacore/keda/issues/new) on our GitHub repo.

## Deploying with Helm {#helm}

### Install

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
    helm install keda kedacore/keda --version 2.0.0-rc2 --namespace keda
    ```

### Uninstall

If you want to remove KEDA from a cluster you can run one of the following:

**Using Helm 3**

```sh
helm uninstall -n keda keda
kubectl delete -f https://raw.githubusercontent.com/kedacore/keda/main/config/crd/bases/keda.sh_scaledobjects.yaml
kubectl delete -f https://raw.githubusercontent.com/kedacore/keda/main/config/crd/bases/keda.sh_scaledjobs.yaml
kubectl delete -f https://raw.githubusercontent.com/kedacore/keda/main/config/crd/bases/keda.sh_triggerauthentications.yaml
```

**Using Helm 2**

```sh
helm delete --purge keda
kubectl delete -f https://raw.githubusercontent.com/kedacore/keda/main/config/crd/bases/keda.sh_scaledobjects.yaml
kubectl delete -f https://raw.githubusercontent.com/kedacore/keda/main/config/crd/bases/keda.sh_scaledjobs.yaml
kubectl delete -f https://raw.githubusercontent.com/kedacore/keda/main/config/crd/bases/keda.sh_triggerauthentications.yaml
```

## Deploying with Operator Hub {#operatorhub}

### Install

1. On Operator Hub Marketplace locate and install KEDA operator
2. Create namespace `keda`
3. Create `KedaController` resource named `keda` in namespace `keda`
![Operator Hub installation](https://raw.githubusercontent.com/kedacore/keda-olm-operator/master/images/keda-olm-install.gif)
> 💡 **NOTE:** Further information on Operator Hub installation method can be found in the following [repository](https://github.com/kedacore/keda-olm-operator).

### Uninstall

Locate installed KEDA Operator in `keda` namespace, then remove created `KedaController` resource and uninstall KEDA operator.

## Deploying using the deployment YAML files {#yaml}

### Install

If you want to try KEDA on [Minikube](https://minikube.sigs.k8s.io) or a different Kubernetes deployment without using Helm you can still deploy it with `kubectl`.

- We provide sample YAML declaration which includes our CRDs and all other resources in a file which is available on the [GitHub releases](https://github.com/kedacore/keda/releases) page.
Run the following command (if needed, replace the version, in this case `2.0.0-rc2`, with the one you are using):

```sh
kubectl apply -f https://github.com/kedacore/keda/releases/download/v2.0.0-rc2/keda-2.0.0-rc2.yaml
```

- Alternatively you can download the file and deploy it from the local path:
```sh
kubectl apply -f keda-2.0.0-rc2.yaml
```

- You can also find the same YAML declarations in our `/config` directory on our [GitHub repo](https://github.com/kedacore/keda) if you prefer to clone it.

```sh
git clone https://github.com/kedacore/keda && cd keda

VERSION=2.0.0-rc2 make deploy
```

### Uninstall

- In case of installing from released YAML file just run the following command (if needed, replace the version, in this case `2.0.0`, with the one you are using):

```sh
kubectl delete -f https://github.com/kedacore/keda/releases/download/v2.0.0-rc2/keda-2.0.0-rc2.yaml
```

- If you have downloaded the file locally, you can run:

```sh
kubectl delete -f keda-2.0.0-rc2.yaml
```

- You would need to run these commands from within the directory of the cloned [GitHub repo](https://github.com/kedacore/keda):

```sh
VERSION=2.0.0-rc2 make undeploy
```
