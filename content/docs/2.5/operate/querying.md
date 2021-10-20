+++
title = "Querying metrics"
description = "Guidance for querying KEDA metrics"
weight = 100
+++

## Querying KEDA metrics

The metrics exposed by KEDA Metrics Adapter can be queried directly using `kubectl`:
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
      "name": "s0-rabbitmq--mymetric",
      "singularName": "",
      "namespaced": true,
      "kind": "ExternalMetricValueList",
      "verbs": [
        "get"
      ]
    },
    {
      "name": "s1-rabbitmq--mymetric2",
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
For example, if you want to get the value of the metric named `s1-rabbitmq--mymetric2` in namespace `sample-ns`, the query will be like this:
```bash
kubectl get --raw "/apis/external.metrics.k8s.io/v1beta1/namespaces/sample-ns/s1-rabbitmq--mymetric2"
```
And it will show a json like this:
```json
{
  "kind": "ExternalMetricValueList",
  "apiVersion": "external.metrics.k8s.io/v1beta1",
  "metadata": {},
  "items": [
    {
      "metricName": "s1-rabbitmq--mymetric2",
      "metricLabels": null,
      "timestamp": "2021-10-20T10:48:17Z",
      "value": "0"
    }
  ]
}
```

> **Note:** There are 2 exceptions to this document and those are `cpu` and `memory`. When KEDA is creating the HPA object, it uses the normal `cpu` and `memory` metrics from the cluster metric-server. If you want to query these 2 specifyc values, you should do it using `/apis/metrics.k8s.io/v1beta1` instead `/apis/external.metrics.k8s.io/v1beta1`.