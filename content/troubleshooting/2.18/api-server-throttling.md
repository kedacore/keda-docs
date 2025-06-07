+++
title = "Troubleshooting API Server Throttling"
description = "Learn how to troubleshoot and resolve KEDA API server throttling issues"
weight = 500
+++

# Troubleshooting KEDA API Server Throttling

If you are experiencing messages like "Waited for ... due to client-side throttling" in your KEDA operator logs, it might indicate that the KEDA operator is being throttled by the Kubernetes API server. This can happen in environments with a large number of `ScaledObject` resources.

KEDA provides several command-line flags to control its interaction with the Kubernetes API server. Adjusting these flags can help alleviate client-side throttling.

## Key Configuration Flags

The following flags are relevant for tuning KEDA's API server interaction:

*   `--kube-api-qps` (Default: `20.0`): This flag sets the maximum queries per second (QPS) that the KEDA operator can make to the Kubernetes API server.
*   `--kube-api-burst` (Default: `30`): This flag sets the maximum burst of requests that the KEDA operator can make to the Kubernetes API server.
*   `--keda-scaledobject-ctrl-max-reconciles` (Default: `5`): This flag determines the maximum number of `ScaledObject` resources that the KEDA operator will reconcile concurrently.

## Recommendation for Adjusting Flags

In environments with a large number of `ScaledObject` resources (e.g., 400 or more), the default values for these parameters might be too low.

It is recommended to experiment with increasing the values of these parameters:

*   **`--kube-api-qps` and `--kube-api-burst`**: Increasing these values allows the KEDA operator to make more requests to the API server per unit of time.
    *   Consider starting by doubling the default values (e.g., set `--kube-api-qps=40` and `--kube-api-burst=60`).
    *   Monitor the impact on both KEDA's performance and the API server's load.
*   **`--keda-scaledobject-ctrl-max-reconciles`**: Increasing this value allows KEDA to process more `ScaledObject` resources in parallel. However, this will also increase the overall load on the API server.
    *   Consider a moderate increase (e.g., to `10`).
    *   Observe the performance and API server load.

## Important Considerations

*   **API Server Load:** Increasing these parameters will inevitably increase the load on the Kubernetes API server. It is crucial to monitor the API server's performance (CPU, memory, request latency) after making these changes to ensure it is not being overwhelmed.
*   **Gradual Adjustments:** Make adjustments to these parameters gradually. Monitor the system's behavior closely after each change. This iterative approach will help in finding the optimal values for your specific environment.
*   **Throttling vs. Server Overload:** While these adjustments can help with client-side throttling, if the API server itself is overloaded, these changes might exacerbate the problem. Ensure your Kubernetes API server has sufficient resources (CPU, memory) to handle the increased load.

## How to Apply Changes

These flags are typically set when deploying the KEDA operator. You will need to update the KEDA operator's deployment manifest (e.g., its `Deployment` YAML) to include these flags in the `args` section of the operator container.

**Example (partial Deployment YAML):**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: keda-operator
  namespace: keda # Or your KEDA installation namespace
spec:
  template:
    spec:
      containers:
      - name: keda-operator # Or keda-metrics-apiserver, depending on which component is throttled
        args:
        - "--kube-api-qps=40"
        - "--kube-api-burst=60"
        - "--keda-scaledobject-ctrl-max-reconciles=10"
        # ... other existing arguments for the KEDA operator
```

## Status Update Optimization

As of recent versions of KEDA, the operator includes built-in optimizations to reduce unnecessary ScaledObject status updates. The operator now:

- **Compares condition states**: Before updating status, KEDA compares the new conditions (Type, Status, Reason, and Message) with existing ones
- **Skips redundant updates**: Status updates are only performed when conditions have actually changed
- **Handles edge cases**: Properly distinguishes between empty condition sets and initialized conditions with 'Unknown' status

This optimization is particularly beneficial in environments with many ScaledObjects, as it can significantly reduce the number of API calls made by the KEDA operator, helping to prevent API server throttling issues described above.

For the most up-to-date information about this optimization, refer to the [KEDA CHANGELOG](https://github.com/kedacore/keda/blob/main/CHANGELOG.md).

## Expected Impact

With proper configuration and built-in optimizations, users typically experience:

- **Reduced throttling messages**: Fewer "client-side throttling" warnings in KEDA operator logs
- **Lower API server load**: Decreased request volume from KEDA operations to the Kubernetes API server
- **Improved performance**: Better responsiveness in environments with 100+ ScaledObjects
- **More stable scaling**: Consistent autoscaling behavior without throttling-related delays

## Additional Troubleshooting

By carefully tuning these parameters and leveraging KEDA's built-in optimizations, you should be able to reduce or eliminate the client-side throttling experienced by the KEDA operator. If throttling persists even after these adjustments, consider:

- Further investigation into the API server's capacity and resource allocation
- Reviewing your ScaledObject configurations for potential optimizations
- Consulting the KEDA community for environment-specific guidance

If issues continue, potential code-level optimizations within KEDA might be necessary, and feedback to the KEDA project maintainers would be valuable. 