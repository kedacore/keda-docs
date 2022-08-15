+++
title = "Azure Workload Identity"
+++

[**Azure AD Workload Identity**](https://github.com/Azure/azure-workload-identity) is the newer version of [**Azure AD Pod Identity**](https://github.com/Azure/aad-pod-identity). It lets your Kubernetes workloads access Azure resources using an
[**Azure AD Application**](https://docs.microsoft.com/en-us/azure/active-directory/develop/app-objects-and-service-principals)
without having to specify secrets, using [federated identity credentials](https://azure.github.io/azure-workload-identity/docs/topics/federated-identity-credential.html) - *Don't manage secrets, let Azure AD do the hard work*.

You can tell KEDA to use Azure AD Workload Identity via `podIdentity.provider`.

```yaml
podIdentity:
  provider: azure-workload  # Optional. Default: none
  identityId: <identity-id> # Optional. Default: ClientId From annotation on service-account.
```

Azure AD Workload Identity will give access to pods with service accounts having appropriate labels and annotations. Refer
to these [docs](https://azure.github.io/azure-workload-identity/docs/topics/service-account-labels-and-annotations.html) for more information. You can set these labels and annotations on the KEDA Operator service account. This can be done for you during deployment with Helm with the
following flags -

1. `--set podIdentity.azureWorkload.enabled=true`
2. `--set podIdentity.azureWorkload.clientId={azure-ad-client-id}`
3. `--set podIdentity.azureWorkload.tenantId={azure-ad-tenant-id}`

You can override the identity that was assigned to KEDA during installation, by specifying an `identityId` parameter under the `podIdentity` field. This allows end-users to use different identities to access various resources which is more secure than using a single identity that has access to multiple resources.
