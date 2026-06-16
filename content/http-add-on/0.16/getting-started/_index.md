+++
title = "Getting Started"
description = "Sample HTTP application deployment and autoscaling with the KEDA HTTP Add-on"
weight = 100
+++

In this tutorial, we will install the KEDA HTTP Add-on and use it to autoscale an HTTP application based on incoming traffic — including scaling to zero when idle.

By the end, we will have:

- A sample HTTP application running in our cluster
- The HTTP Add-on intercepting and counting requests
- KEDA scaling the application up under load and back to zero when traffic stops

## Prerequisites

Before we begin, we need:

- A Kubernetes cluster (kind, minikube, or a cloud provider)
- `kubectl` configured to access the cluster
- [Helm 3](https://helm.sh/docs/intro/install/) installed
- KEDA core installed:

  ```shell
  helm install keda kedacore/keda --namespace keda --create-namespace
  ```

  See the [KEDA deployment docs](https://keda.sh/docs/deploy/) for other installation methods.

## Step 1: Add the KEDA Helm Repository

If we have not already added the KEDA Helm repository, we add it now and update our local chart index:

```shell
helm repo add kedacore https://kedacore.github.io/charts
helm repo update
```

## Step 2: Install the HTTP Add-on

We install the HTTP Add-on into the same `keda` namespace where KEDA core is running:

```shell
helm install http-add-on kedacore/keda-add-ons-http --namespace keda
```

We verify that all components are running:

```shell
kubectl get pods -n keda
```

We will see pods for the operator, interceptor, and scaler — all with a `Running` status:

```
NAME                                                   READY   STATUS    RESTARTS   AGE
keda-add-ons-http-interceptor-...                      1/1     Running   0          30s
keda-add-ons-http-operator-...                         1/1     Running   0          30s
keda-add-ons-http-scaler-...                           1/1     Running   0          30s
keda-admission-webhooks-...                            1/1     Running   0          2m
keda-operator-...                                      1/1     Running   0          2m
keda-operator-metrics-apiserver-...                    1/1     Running   0          2m
```

## Step 3: Deploy a Sample Application

We create a namespace and deploy a sample HTTP application using [traefik/whoami](https://github.com/traefik/whoami), a lightweight HTTP server that responds with request metadata.

```shell
kubectl create namespace demo
```

We deploy a Deployment and Service:

```shell
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sample-app
  namespace: demo
spec:
  selector:
    matchLabels:
      app: sample-app
  template:
    metadata:
      labels:
        app: sample-app
    spec:
      containers:
        - name: sample-app
          image: traefik/whoami
          args: ["--port=8080"]
          ports:
            - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: sample-app
  namespace: demo
spec:
  selector:
    app: sample-app
  ports:
    - port: 80
      targetPort: 8080
EOF
```

We verify the Deployment was created:

```shell
kubectl get deployment -n demo
```

We will see the Deployment with 1 replica running (the Kubernetes default):

```
NAME         READY   UP-TO-DATE   AVAILABLE   AGE
sample-app   1/1     1            1           10s
```

## Step 4: Create an InterceptorRoute

The `InterceptorRoute` tells the interceptor how to route requests to our sample app and what scaling metric to use.

```shell
kubectl apply -f - <<EOF
apiVersion: http.keda.sh/v1beta1
kind: InterceptorRoute
metadata:
  name: sample-app
  namespace: demo
spec:
  target:
    service: sample-app
    port: 80
  rules:
    - hosts:
        - sample-app.example.com
  scalingMetric:
    requestRate:
      targetValue: 5
      window: 1m
      granularity: 1s
EOF
```

The `requestRate` metric scales based on requests per second, averaged over the configured `window`.
A `targetValue: 5` means the add-on targets 5 requests per second per replica.
We use a low value here so that scaling is visible during testing.
See [Scaling](../concepts/scaling/) for details on scaling metrics and how to tune them.

We verify the InterceptorRoute is ready:

```shell
kubectl get interceptorroute -n demo
```

We will see:

```
NAME         TARGETSERVICE   READY   AGE
sample-app   sample-app      True    10s
```

## Step 5: Create a ScaledObject

The `ScaledObject` tells KEDA how to scale our `sample-app` deployment.
It uses the `external-push` trigger type, which receives metrics from the HTTP Add-on's scaler component.

```shell
kubectl apply -f - <<EOF
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: sample-app
  namespace: demo
spec:
  scaleTargetRef:
    name: sample-app
  minReplicaCount: 0
  maxReplicaCount: 10
  cooldownPeriod: 30
  triggers:
    - type: external-push
      metadata:
        scalerAddress: keda-add-ons-http-external-scaler.keda:9090
        interceptorRoute: sample-app
EOF
```

The `interceptorRoute` value must match the name of the `InterceptorRoute` we created in the previous step.
See [Architecture](../concepts/architecture/) for details on how these components connect.

We verify the ScaledObject was created:

```shell
kubectl get scaledobject -n demo
```

We will see:

```
NAME         SCALETARGETKIND      SCALETARGETNAME   MIN   MAX   TRIGGERS        ...
sample-app   apps/v1.Deployment   sample-app        0     10    external-push   ...
```

## Step 6: Send Traffic and Observe Scaling

Now we test that autoscaling works.
Since there is no traffic, KEDA has scaled the deployment to 0 replicas.
We verify this:

```shell
kubectl get deployment sample-app -n demo
```

```
NAME         READY   UP-TO-DATE   AVAILABLE   AGE
sample-app   0/0     0            0           2m
```

For testing, we use `kubectl port-forward` to access the interceptor proxy.
In production, your ingress or gateway must route traffic to the interceptor proxy service (`keda-add-ons-http-interceptor-proxy`) instead of directly to your application — see [Configure Ingress](../user-guide/configure-ingress/) for details.

```shell
kubectl port-forward -n keda svc/keda-add-ons-http-interceptor-proxy 8090:8080
```

In another terminal, we send a request with the matching `Host` header:

```shell
curl -H "Host: sample-app.example.com" localhost:8090
```

The first request may take a few seconds.
This is the cold start: KEDA is scaling the deployment from 0 to 1 replica, and the interceptor holds the request until the pod is ready.
We will see a response from the sample app once the pod starts.

We check replicas again:

```shell
kubectl get deployment sample-app -n demo
```

We will see 1 replica running:

```
NAME         READY   UP-TO-DATE   AVAILABLE   AGE
sample-app   1/1     1            1           3m
```

## Step 7: Generate Load and Watch It Scale Up

To see scaling beyond 1 replica, we generate a burst of traffic.
The `wait=50ms` query parameter tells whoami to hold each response for 50 milliseconds, which produces a steady rate of about 20 requests per second — enough to trigger scaling with our `targetValue` of 5:

```shell
for i in $(seq 1 300); do curl -s -H "Host: sample-app.example.com" "localhost:8090/?wait=50ms" > /dev/null; done
```

After the burst finishes, we check the deployment:

```shell
kubectl get deployment sample-app -n demo
```

We will see the replica count has increased:

```
NAME         READY   UP-TO-DATE   AVAILABLE   AGE
sample-app   2/2     2            2           5m
```

## Step 8: Observe Scale to Zero

After the burst ends and the cooldown period passes (30 seconds, as configured in our ScaledObject), KEDA scales the deployment back to 0.
We can watch this happen:

```shell
kubectl get deployment sample-app -n demo -w
```

We will see replicas decrease to 0:

```
NAME         READY   UP-TO-DATE   AVAILABLE   AGE
sample-app   2/2     2            2           5m
sample-app   1/1     1            1           6m
sample-app   0/0     0            0           7m
```

## Step 9: Clean Up

To remove the sample application and all its resources:

```shell
kubectl delete namespace demo
```

## What's Next

- [Architecture](../concepts/architecture/) — Understand how the interceptor, scaler, and operator work together.
- [Autoscale an App](../user-guide/autoscale-an-app/) — Apply this pattern to your own services.
- [Configure Ingress](../user-guide/configure-ingress/) — Set up Gateway API or Ingress for production traffic.
- [Configure Scaling Metrics](../user-guide/configure-scaling/) — Tune concurrency targets or switch to request-rate scaling.

## Getting Help

- [Kubernetes Slack](https://kubernetes.slack.com/archives/CKZJ36A5D) — `#keda` channel ([join here](https://slack.k8s.io))
- [GitHub Issues](https://github.com/kedacore/http-add-on/issues) — Bug reports and feature requests
- [GitHub Discussions](https://github.com/kedacore/http-add-on/discussions) — Questions and general conversation
