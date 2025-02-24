+++
title = "Bound service account token"
+++

You can pull one or more service account tokens into the trigger by defining the `serviceAccountName` of the Kubernetes service account.

```yaml
boundServiceAccountToken:                   # Optional.
  - parameter: connectionString             # Required - Defined by the scale trigger
    serviceAccountName: my-service-account  # Required.
```

**Assumptions:** `namespace` is in the same resource as referenced by `scaleTargetRef.name` in the ScaledObject, unless specified otherwise.

## Permissions for KEDA to request service account tokens

By default, the KEDA operator does not have the necessary permissions to request service account tokens from an arbitrary service account. This is to prevent a privilege escalation where a bad actor could use KEDA to request tokens on behalf of any service account in the cluster.

To allow KEDA to request tokens from a service account, you must grant the `keda-operator` service account the necessary permissions using RBAC. This can be done by creating a `Role` and a `RoleBinding` in the service account's namespace to allow the `keda-operator` service account the `create` permission on the namespaced `serviceaccounts/token` subresource.

Here's a minimal example of a `Role` and `RoleBinding` that grants the necessary permissions for the KEDA operator to request and use tokens from the namespaced `my-service-account` service account.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: keda-operator-token-creator
  namespace: my-namespace # Replace with the namespace of the service account
rules:
- apiGroups:
  - ""
  resources:
  - serviceaccounts/token
  verbs:
  - create
  resourceNames:
  - my-service-account # Replace with the name of the service account
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: keda-operator-token-creator-binding
  namespace: my-namespace # Replace with the namespace of the service account
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: keda-operator-token-creator
subjects:
- kind: ServiceAccount
  name: keda-operator
  namespace: keda # Assuming the keda-operator service account is in the keda namespace
```

After applying similar restrictive permissions in your cluster, you can create the `TriggerAuthentication` resource that references the service account name, allowing KEDA to request and use tokens on your behalf with your scaler. Note that the service account must also have the necessary Kubernetes API permissions to perform the actions required by the scaler, such as querying metrics or managing resources, if the scaler delegates authentication to the Kubernetes API.
