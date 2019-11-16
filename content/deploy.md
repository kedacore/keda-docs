+++
title = "Deploying KEDA"
date = "2017-10-05"
fragment = "content"
weight = 100
+++

KEDA consists of two components - [Runtime](#runtime) & [Dashboard](#dashboard).

You'll find steps how to deploy them in this article.

## Runtime

We provide a few approaches to deploy KEDA runtime in your Kubernetes clusters:

- Operator framework
- Helm charts
- Azure Function Core Tools
- YAML declarations

Don't see what you need? Feel free to [create an issue](https://github.com/kedacore/keda/issues/new) on our GitHub repo.

### Deploying with Helm

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

    ###### Helm 2

    ```cli
    helm install kedacore/keda --namespace keda --name keda
    ```

    ###### Helm 3

    ```cli
    kubectl create namespace keda
    helm install keda kedacore/keda --namespace keda
    ```

### Deploying with the Azure Functions Core Tools
KEDA supports autoscaling a variety of workloads which include Azure Functions and is included in their [Azure Functions Core Tools](https://github.com/Azure/azure-functions-core-tools).

Here is how you can easily install KEDA with their CLI:
```
func kubernetes install --namespace keda
```

### Deploying using the deploy yaml
If you want to try KEDA on minikube or a different Kubernetes deployment without using Helm you can still deploy it with `kubectl`.

We provide sample YAML declarations which includes our CRD - You can find them in our `/deploy` directory on our [GitHub repo](https://github.com/kedacore/keda).

```
kubectl create namespace keda
kubectl apply -f deploy/crds/keda.k8s.io_scaledobjects_crd.yaml
kubectl apply -f deploy/crds/keda.k8s.io_triggerauthentications_crd.yaml
kubectl apply -f deploy/
```

## Dashboard

You can install the KEDA dashboard by using the deployment YAML in the repo:

```
git clone https://github.com/kedacore/dashboard
cd dashboard
kubectl apply -f deploy/keda-dashboard.yaml
```

<br/><br/>

---

## Uninstalling KEDA

If you want to remove KEDA from a cluster you can run one of the following:

##### Using Helm 3

```cli
helm uninstall -n keda keda
kubectl delete -f https://raw.githubusercontent.com/kedacore/keda/master/deploy/crds/keda.k8s.io_scaledobjects_crd.yaml
kubectl delete -f https://raw.githubusercontent.com/kedacore/keda/master/deploy/crds/keda.k8s.io_triggerauthentications_crd.yaml
```

##### Using Helm 2

```cli
helm delete --purge keda
kubectl delete -f https://raw.githubusercontent.com/kedacore/keda/master/deploy/crds/keda.k8s.io_scaledobjects_crd.yaml
kubectl delete -f https://raw.githubusercontent.com/kedacore/keda/master/deploy/crds/keda.k8s.io_triggerauthentications_crd.yaml
```

##### Using YAML

You would need to run these commands from within the directory of the cloned [GitHub repo](https://github.com/kedacore/keda)

```cli
kubectl delete -f deploy/crds/keda.k8s.io_scaledobjects_crd.yaml
kubectl delete -f deploy/crds/keda.k8s.io_triggerauthentications_crd.yaml
kubectl delete -f deploy/
```