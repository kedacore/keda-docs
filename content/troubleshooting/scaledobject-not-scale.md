+++
title = "Why is my `ScaledObject` not scaling as expected?"
weight = 1
+++

There are a number of reasons why your KEDA scaling may not be working as expected, 

## Common issues

### KEDA scaler source is invalid

When KEDA has upstream errors to get scaler source information it will keep the current instance count of the workload unless the `fallback` section is defined. This behavior might feel like the autoscaling is not happening, but in reality, it is because of problems related to the scaler source.

### DesiredReplicas is within 10% of the target value

If the replica mismatch is within 10% of the target value, you may be experiencing a known issue whereby Kubernetes `HorizontalPodAutoscalers` have a default tolerance of 10%. If your desired value is within 10% of the scaling metric, the HPA will not scale. More detail on this scenario can be found in [this issue against the KEDA project](https://github.com/kedacore/keda/issues/5263) and [this issue against the Kubernetes project](https://github.com/kubernetes/kubernetes/issues/116984).

## Debugging process

### Check KEDA pods for errors

The most effective place to start for debugging your issue is by reviewing the logs from the KEDA pods where you may see errors in both our Operator and Metrics server. You can [enable debug logging](https://github.com/kedacore/keda/blob/main/BUILD.md#setting-log-levels) to provide more verbose output, which may be helpful in some scenarios.

### Check the Kubernetes resources for errors

You can check the status of the `ScaledObject` (`READY` and `ACTIVE` condition) by running following command:

```bash
$ kubectl get scaledobject MY-SCALED-OBJECT
```

It is also possible to check the status conditions on the related HPA itself to determine whether the HPA is also healthy:

```bash
$ kubectl get horizontalpodautoscaler MY-HPA
```
