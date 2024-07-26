+++
title = "Deploying KEDA"
+++

We provide a few approaches to deploy KEDA runtime in your Kubernetes clusters:

- Helm charts
- Operator Hub
- YAML declarations

> 💡 **NOTE:** KEDA requires Kubernetes cluster version 1.27 and higher

Don't see what you need? Feel free to [create an issue](https://github.com/kedacore/keda/issues/new) on our GitHub repo.

## Deploying with Helm {#helm}

### Install

To deploy KEDA with Helm:

1. Add Helm repo

    ```sh
    helm repo add kedacore https://kedacore.github.io/charts
    ```

2. Update Helm repo

    ```sh
    helm repo update
    ```

3. Install `keda` Helm chart

    **Helm 3**

    ```sh
    helm install keda kedacore/keda --namespace keda --create-namespace
    ```

To deploy the CRDs separately from the Helm chart, use the `keda-2.xx.x-crds.yaml` file provided on the [GitHub releases](https://github.com/kedacore/keda/releases) page.

> 💡 **NOTE:** Are you upgrading to v2.2.1 or above? Make sure to read [our troubleshooting guide](https://keda.sh/docs/latest/troubleshooting/) to fix potential CRD issues.

### Uninstall

If you want to remove KEDA from a cluster, you first need to remove any ScaledObjects and ScaledJobs that you have created. Once that is done, the Helm chart can be uninstalled:

```sh
kubectl delete $(kubectl get scaledobjects.keda.sh,scaledjobs.keda.sh -A \
  -o jsonpath='{"-n "}{.items[*].metadata.namespace}{" "}{.items[*].kind}{"/"}{.items[*].metadata.name}{"\n"}')
helm uninstall keda -n keda
```

Note: if you uninstall the Helm chart without first deleting any ScaledObject or ScaledJob resources you have created, they will become orphaned. In this situation, you will need to patch the resources to remove their finalizers. Once this is done, they should automatically be removed:

```sh
for i in $(kubectl get scaledobjects -A \
  -o jsonpath='{"-n "}{.items[*].metadata.namespace}{" "}{.items[*].kind}{"/"}{.items[*].metadata.name}{"\n"}');
do kubectl patch $i -p '{"metadata":{"finalizers":null}}' --type=merge
done

for i in $(kubectl get scaledjobs -A \
  -o jsonpath='{"-n "}{.items[*].metadata.namespace}{" "}{.items[*].kind}{"/"}{.items[*].metadata.name}{"\n"}');
do kubectl patch $i -p '{"metadata":{"finalizers":null}}' --type=merge
done
```

## Deploying with Operator Hub {#operatorhub}

### Install

1. On Operator Hub Marketplace locate and install KEDA operator to namespace `keda`
2. Create `KedaController` resource named `keda` in namespace `keda`
![Operator Hub installation](https://raw.githubusercontent.com/kedacore/keda-olm-operator/main/images/keda-olm-install.gif)
> 💡 **NOTE:** Further information on Operator Hub installation method can be found in the following [repository](https://github.com/kedacore/keda-olm-operator).

### Uninstall

Locate installed KEDA Operator in `keda` namespace, then remove created `KedaController` resource and uninstall KEDA operator.

## Deploying using the deployment YAML files {#yaml}

### Install

If you want to try KEDA on [Minikube](https://minikube.sigs.k8s.io) or a different Kubernetes deployment without using Helm you can still deploy it with `kubectl`.

- We provide sample YAML declaration which includes our CRDs and all other resources in a file which is available on the [GitHub releases](https://github.com/kedacore/keda/releases) page. 
  - We offer two options to deploy KEDA:
    - Use `keda-2.xx.x.yaml` that includes all features, including [admission webhooks](./concepts/admission-webhooks.md) (recommended)
    - Use `keda-2.xx.x-core.yaml` that installs the minimal required KEDA components, without admission webhooks

Run the following command (if needed, replace the version, in this case `2.15.0`, with the one you are using):

```sh
# Including admission webhooks
kubectl apply --server-side -f https://github.com/kedacore/keda/releases/download/v2.15.0/keda-2.15.0.yaml
# Without admission webhooks
kubectl apply --server-side -f https://github.com/kedacore/keda/releases/download/v2.15.0/keda-2.15.0-core.yaml
```

- Alternatively you can download the file and deploy it from the local path:
```sh
# Including admission webhooks
kubectl apply --server-side -f keda-2.15.0.yaml
# Without admission webhooks
kubectl apply --server-side -f keda-2.15.0-core.yaml
```

> 💡 **NOTE:** `--server-side` option is needed because the ScaledJob CRD is too long to process, see [this issue](https://github.com/kedacore/keda/issues/4740) for details.

- You can also find the same YAML declarations in our `/config` directory on our [GitHub repo](https://github.com/kedacore/keda) if you prefer to clone it.

```sh
git clone https://github.com/kedacore/keda && cd keda

VERSION=2.15.0 make deploy
```

### Uninstall

- In case of installing from released YAML file just run the following command (if needed, replace the version, in this case `2.15.0`, with the one you are using):

```sh
# Including admission webhooks
kubectl delete -f https://github.com/kedacore/keda/releases/download/v2.15.0/keda-2.15.0.yaml
# Without admission webhooks
kubectl delete -f https://github.com/kedacore/keda/releases/download/v2.15.0/keda-2.15.0-core.yaml
```

- If you have downloaded the file locally, you can run:

```sh
# Including admission webhooks
kubectl delete -f keda-2.15.0.yaml
# Without admission webhooks
kubectl delete -f keda-2.15.0-core.yaml
```

- You would need to run these commands from within the directory of the cloned [GitHub repo](https://github.com/kedacore/keda):

```sh
VERSION=2.15.0 make undeploy
```

## Deploying KEDA on MicroK8s {#microk8s}

### Install

If you want to try KEDA v2 on [MicroK8s](https://microk8s.io/) from `1.20` channel, KEDA is included into MicroK8s add-ons.

```sh
microk8s enable keda
```

### Uninstall

To uninstall KEDA in MicroK8s, disable the add-on as shown below.

```sh
microk8s disable keda
```
