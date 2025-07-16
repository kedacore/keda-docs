+++
title = "Context Deadline Exceeded when `kubectl apply`?"
weight = 2
+++

If you're encountering the following error when trying to apply a `ScaledObject` using the `kubectl apply` command:
```sh
kubectl apply -f nginx-scaledobject.yaml
```
And receive an error like:

`Error from server (Timeout): error when applying patch:`
`{"metadata":{"annotations":{"kubectl.kubernetes.io/last-applied-configuration":"{\"apiVersion\":\"keda.sh/v1alpha1\",\"kind\":\"ScaledObject\",\"metadata\":{\"annotations\":{},\"name\":\"nginx-scaledobject\",\"namespace\":\"default\"},\"spec\":{\"cooldownPeriod\":300,\"maxReplicaCount\":2,\"minReplicaCount\":1,\"pollingInterval\":3,\"scaleTargetRef\":{\"name\":\"nginx-deploy\"},\"triggers\":[{\"metadata\":{\"type\":\"Utilization\",\"value\":\"90\"},\"type\":\"cpu\"}]}}\n"}},"spec":{"maxReplicaCount":2}}`
`to:`
`Resource: "keda.sh/v1alpha1, Resource=scaledobjects", GroupVersionKind: "keda.sh/v1alpha1, Kind=ScaledObject"`
`Name: "nginx-scaledobject", Namespace: "default"`
`for: "nginx-scaledobject.yaml": error when patching "nginx-scaledobject.yaml": Timeout: request did not complete within requested timeout - context deadline exceeded`.

### Root cause
This issue commonly occurs when the KEDA admission webhook is not reachable by the Kubernetes control plane due to a network connectivity issue, typically on port 9443, which the webhook listens on.

### Solution (For Managed Kubernetes Services)

__Step 1__: Enable Debug Logging on the Webhook
This helps confirm whether the request is reaching the webhook.

__Option A__: If KEDA was installed via Helm:

Update your values.yaml file:
```sh
webhooks:
  level: debug
```
Then upgrade your Helm release:
```sh
helm upgrade <release-name> kedacore/keda -n keda -f values.yaml
```

__Option B__: If KEDA was installed manually (without Helm):

Edit the webhook deployment:
```sh
kubectl edit deployment keda-admission-webhooks -n keda
```
Add or update the arguments to include:
```sh
args:
  - "--zap-log-level=debug"
```

__Step 2__: Check Webhook Logs
To confirm if the webhook is receiving the request:
```sh
kubectl logs -l app=keda-admission-webhooks -n keda
```
If no logs appear when you run `kubectl apply`, it means the webhook pod is not being reached.


__Step 3__: Check Network Connectivity
Ensure port 9443 is open between:

- The Kubernetes control plane (where `kubectl apply` runs)

- The nodes hosting the `keda-admission-webhooks` pod

This often involves configuring firewall rules or security groups to allow traffic from the control plane IP range to the node IP range on port 9443.

### Final Test:
After opening port `9443`, try applying your ScaledObject again:
```sh
kubectl apply -f nginx-scaledobject.yaml
```
If the webhook logs now show activity and the resource is created or properly rejected, the issue is resolved.
