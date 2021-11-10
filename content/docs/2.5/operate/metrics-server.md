+++
title = "KEDA Metrics Server"
description = "Details on KEDA Metrics Server"
weight = 100
+++

## Querying metrics exposed by KEDA Metrics Server

The metrics exposed by KEDA Metrics Server can be queried directly using `kubectl`:
```bash
kubectl get --raw "/apis/external.metrics.k8s.io/v1beta1"
```

This will return a json with the list of metrics exposed by KEDA:
```json
{
  "kind": "APIResourceList",
  "apiVersion": "v1",
  "groupVersion": "external.metrics.k8s.io/v1beta1",
  "resources": [
    {
      "name": "s0-rabbitmq-queueName",
      "singularName": "",
      "namespaced": true,
      "kind": "ExternalMetricValueList",
      "verbs": [
        "get"
      ]
    },
    {
      "name": "s1-rabbitmq-queueName2",
      ....
    }
  ]
}
```

You can also query for the value of a specifyc metric using `kubectl`:
```bash
kubectl get --raw "/apis/external.metrics.k8s.io/v1beta1/namespaces/YOUR_NAMESPACE/YOUR_METRIC_NAME"
```

At this point, you should take in consideration that KEDA metrics are namespaced, this means that you have to specify the namespace where the `ScaledObject` is placed inside.

For example, if you want to get the value of the metric named `s1-rabbitmq-queueName2` in namespace `sample-ns`, the query will be like this:
```bash
kubectl get --raw "/apis/external.metrics.k8s.io/v1beta1/namespaces/sample-ns/s1-rabbitmq-queueName2"
```

And it will show a json like this:

```json
{
  "kind": "ExternalMetricValueList",
  "apiVersion": "external.metrics.k8s.io/v1beta1",
  "metadata": {},
  "items": [
    {
      "metricName": "s1-rabbitmq-queueName2",
      "metricLabels": null,
      "timestamp": "2021-10-20T10:48:17Z",
      "value": "0"
    }
  ]
}
```

> **Note:** There are 2 exceptions in querying metrics and those are `cpu` and `memory` scalers. When KEDA creates the HPA object, it uses standard `cpu` and `memory` metrics from the Kubernetes Metrics Server. If you want to query these 2 specific values, you should do it using `/apis/metrics.k8s.io/v1beta1` instead of `/apis/external.metrics.k8s.io/v1beta1`.

## How to get metric names from ScaledObject

During its work, KEDA updates each ScaledObject with some relevant information which it needs to work. Part of that information is metric names generated from the triggers inside the own ScaledObject.

You can recover the metric names from a ScaledObject using `kubectl`:
```bash
 kubectl get scaledobject SCALEDOBJECT_NAME -n NAMESPACE -o jsonpath={.status.externalMetricNames}
```