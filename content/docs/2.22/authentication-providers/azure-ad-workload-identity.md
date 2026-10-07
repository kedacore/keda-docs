+++
title = "Azure AD Workload Identity"
+++

[**Azure AD Workload Identity**](https://github.com/Azure/azure-workload-identity) is the newer version of [**Azure AD Pod Identity**](https://github.com/Azure/aad-pod-identity). It lets your Kubernetes workloads access Azure resources using an
[**Azure AD Application**](https://docs.microsoft.com/en-us/azure/active-directory/develop/app-objects-and-service-principals) or [**Azure Managed Identity**](https://docs.microsoft.com/azure/active-directory/managed-identities-azure-resources/overview) without having to specify secrets, using [federated identity credentials](https://azure.github.io/azure-workload-identity/docs/topics/federated-identity-credential.html) - *Don't manage secrets, let Azure AD do the hard work*.

You can tell KEDA to use Azure AD Workload Identity via `podIdentity.provider`. To use a specific Kubernetes service account, see [Select a workload service account](#select-a-workload-service-account).

## Use the operator's service account

The configuration and override examples below apply when `serviceAccountName` is omitted.

```yaml
podIdentity:
  provider: azure-workload                # Optional. Default: none
  identityId: <identity-id>               # Optional. Default: ClientId from annotation on service-account.
  identityTenantId: <tenant-id>           # Optional. Default: TenantId from annotation on service-account.
  identityAuthorityHost: <authority-host> # Optional. Default: AZURE_AUTHORITY_HOST environment variable which is injected by azure-wi-webhook-controller-manager.
```

Azure AD Workload Identity will give access to pods with service accounts having appropriate labels and annotations. Refer
to these [docs](https://azure.github.io/azure-workload-identity/docs/topics/service-account-labels-and-annotations.html) for more information. You can set these labels and annotations on the KEDA Operator service account. This can be done for you during deployment with Helm with the
following flags -

1. `--set podIdentity.azureWorkload.enabled=true`
2. `--set podIdentity.azureWorkload.clientId={azure-ad-client-id}`
3. `--set podIdentity.azureWorkload.tenantId={azure-ad-tenant-id}`

You can override the identity that was assigned to KEDA during installation, by specifying an `identityId` parameter under the `podIdentity` field. This allows end-users to use different identities to access various resources which is more secure than using a single identity that has access to multiple resources.

Additionally, there might be a need for Azure Workload Identity to authenticate across tenants and/or clouds (e.g., AzureCloud, AzureChinaCloud, AzureUSGovernment, AzureGermanCloud). To authenticate against a different tenant within the same cloud, you can specify the `identityTenantId` parameter under the `podIdentity` field. To authenticate against a tenant within a different cloud, you must specify both the `identityTenantId` and `identityAuthorityHost` parameters under the `podIdentity` field. This is useful when you have resources in different tenants or clouds that is different from the tenant and cloud where the KEDA Operator is running.

## Considerations about Federations and Overrides

The concept of "overrides" can be somewhat confusing in certain scenarios, as it may not always be clear which service account needs to be federated with a specific Azure identity to ensure proper functionality.

Let's clarify this with two examples:

### Case 1

Imagine you have an identity for KEDA that has access to ServiceBus A, ServiceBus B, and ServiceBus C. Additionally, you have separate identities for various workloads, resulting in the following setup:

- KEDA's identity with access to ServiceBus A, ServiceBus B, and ServiceBus C (the identity set during installation and not overridden).
- Workload A's identity with access to Service Bus A.
- Workload B's identity with access to Service Bus B.
- Workload C's identity with access to Service Bus C.

In this case, KEDA's Managed Service Identity should only be federated with KEDA's service account.

### Case 2

To avoid granting too many permissions to KEDA's identity, you have a KEDA identity without access to any Service Bus (perhaps unrelated, such as Key Vault). Similar to the previous scenario, you also have separate identities for your workloads:

- KEDA's identity without access to any Service Bus.
- Workload A's identity with access to Service Bus A.
- Workload B's identity with access to Service Bus B.
- Workload C's identity with access to Service Bus C.

In this case, you are overriding the default identity set during installation through the "TriggerAuthentication" option (`.spec.podIdentity.identityId`). Each "ScaledObject" now uses its own "TriggerAuthentication," with each specifying an override (Workload A's TriggerAuthentication sets the identityId for Workload A, Workload B's for Workload B, and so on). Consequently, you don't need to stack excessive permissions on KEDA's identity. However, in this scenario, KEDA's service account must be federated with all the identities it may attempt to assume:

- TriggerAuthentications without overrides will use KEDA's identity (for tasks such as accessing the Key Vault).
- TriggerAuthentications with overrides will use the identity specified in the TriggerAuthentication (requiring KEDA's service account to be federated with them).

### Case 3

Similar to the previous scenario, you also have separate identities for your workloads but in different tenants:

- KEDA's identity without access to any Service Bus.
- Workload A's identity with access to Service Bus A in Tenant A.
- Workload B's identity with access to Service Bus B in Tenant B.

In this case, you are overriding the default identity and tenant set during installation through the "TriggerAuthentication" option (`.spec.podIdentity.identityId` and `.spec.podIdentity.identityTenantId`). Each "ScaledObject" now uses its own "TriggerAuthentication," with each specifying an override (Workload A's TriggerAuthentication sets the identityId and identityTenantId for Workload A and Workload B's for Workload B). It is important to note that within this scenario, KEDA's service account must be federated with all the identities in each tenant.


## Select a workload service account

Set `serviceAccountName` to federate a specific Kubernetes service account. Complete the [administrator approval](../../concepts/workload-service-accounts/#administrator-setup) with audience `api://AzureADTokenExchange` for the account in the ScaledObject or ScaledJob namespace.

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: azure-scaling
  namespace: payments
spec:
  podIdentity:
    provider: azure-workload
    serviceAccountName: scaling-azure
    identityId: 11111111-1111-1111-1111-111111111111
    identityTenantId: 22222222-2222-2222-2222-222222222222
```

**Parameter list for selected-account authentication:**

- `serviceAccountName` - Kubernetes service account in the consuming ScaledObject or ScaledJob namespace. Requires administrator approval for that exact namespace/account.
- `identityId` - Client ID of the managed identity or application. Required when `serviceAccountName` is set.
- `identityTenantId` - Tenant ID of the managed identity or application. Required when `serviceAccountName` is set.
- `identityAuthorityHost` - Microsoft authority for the cloud containing the identity. A trailing `/` is accepted. (Values: `https://login.microsoftonline.com`, `https://login.microsoftonline.us`, `https://login.chinacloudapi.cn`, Default: `https://login.microsoftonline.com`, Optional)

Create a [federated identity credential](https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster#establish-federated-identity-credential-trust) on the managed identity or application for the cluster issuer, subject `system:serviceaccount:payments:scaling-azure`, and audience `api://AzureADTokenExchange`. Grant the identity permissions on the resource being monitored.

Client and tenant IDs must be explicit. KEDA does not read them from the selected service account's annotations or inherit them from the operator. The default authority is Azure public cloud, independently of the operator's `AZURE_AUTHORITY_HOST`. Arbitrary authority URLs are rejected in this mode.

This flow uses direct Microsoft Entra workload identity federation. It does not require the operator's Azure workload identity webhook settings and does not use AKS identity-binding proxies.

Existing scaler metadata requirements still apply. [RabbitMQ](../../scalers/rabbitmq-queue/) requires `workloadIdentityResource`. [Event Hub checkpoint storage](../../scalers/azure-event-hub/) needs `storageAccountName` and storage permissions for the same selected Azure identity. See [supported combinations](../../concepts/workload-service-accounts/#supported-combinations) before combining this mode with other authentication settings.
