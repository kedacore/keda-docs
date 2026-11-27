+++
title = "Workload service accounts"
weight = 510
+++

KEDA can authenticate supported scalers using an administrator-approved Kubernetes service account in the namespace of the consuming `ScaledObject` or `ScaledJob`. Set `spec.podIdentity.provider` to `gcp-workload-service-account` and set `spec.podIdentity.serviceAccountName` in a `TriggerAuthentication` or `ClusterTriggerAuthentication`. KEDA requests a short-lived Kubernetes token (10-minute TTL) for that service account, exchanges it with Google Security Token Service (STS), optionally impersonates a Google IAM service account, and refreshes the resulting Google credentials automatically.

The selected service account does not need to be the account used by the application's Pods. `gcp-workload-service-account` requires `serviceAccountName`. The existing `gcp`, `azure-workload`, `aws`, and `aws-eks` providers retain their existing behavior and reject `serviceAccountName`.

| Provider | Fields used with `serviceAccountName` | Administrator-approved audience |
| --- | --- | --- |
| [GCP](../../authentication-providers/gcp-workload-identity/#select-a-workload-service-account) (`gcp-workload-service-account`) | Optional `identityId`: Google IAM service-account email for impersonation | Google IAM Workload Identity Pool provider or GKE `identitynamespace` pool |

## Administrator setup

Configure Google Cloud to trust your cluster's OIDC issuer, the exact Kubernetes subject `system:serviceaccount:NAMESPACE:SERVICE_ACCOUNT`, and the target audience. Use dedicated service accounts and grant only the least-privilege permissions required by the scaler. See the [GCP Workload Identity guide](../../authentication-providers/gcp-workload-identity/#select-a-workload-service-account) for both external Workload Identity Pool provider and GKE Workload Identity Pool trust setup.

Create the Kubernetes service account in the workload namespace. For example:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: payments
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: scaling-gcp
  namespace: payments
```

Approve each exact namespace, service account, and Google audience in the KEDA Helm installation using `permissions.operator.restrict.cloudWorkloadIdentityTokenCreationRoles`:

```yaml
operator:
  serviceAccountTokens:
    mode: enforce-audience
permissions:
  operator:
    restrict:
      cloudWorkloadIdentityTokenCreationRoles:
        # External Google IAM Workload Identity Pool provider:
        - name: scaling-gcp
          namespace: payments
          audience: https://iam.googleapis.com/projects/123456789012/locations/global/workloadIdentityPools/kubernetes/providers/production-cluster
        # Or GKE project workload identity pool:
        - name: scaling-gke
          namespace: payments
          audience: identitynamespace:my-project.svc.id.goog:https://container.googleapis.com/v1/projects/my-project/locations/us-central1/clusters/prod-cluster
```

Replace the example Google project, pool, provider, location, and cluster values with your configuration. The chart creates a scoped namespaced `Role` and `RoleBinding` granting the operator `create` on `serviceaccounts/token` for each named service account, and serializes the audience mappings into `KEDA_CLOUD_WORKLOAD_IDENTITY_AUDIENCES`. When managing RBAC and runtime configuration separately, configure both as described under [cloud workload identity audiences](../../operate/security/#cloud-workload-identity-audiences).

`KEDA_CLOUD_WORKLOAD_IDENTITY_AUDIENCES` is **strictly isolated** from `KEDA_SERVICE_ACCOUNT_TOKEN_AUDIENCES` (Vault and generic `boundServiceAccountToken`). Approving an account for cloud workload service account federation does not permit generic BSAT or Vault authentication to mint or export its federation token, and mappings in `KEDA_SERVICE_ACCOUNT_TOKEN_AUDIENCES` do not authorize `gcp-workload-service-account`.

`operator.serviceAccountTokens.mode: legacy` is unsupported for workload service account providers and cannot be combined with cloud workload identity audiences. Wildcards are not supported, and each namespace/account pair accepts a single audience mapping. Choose audiences that **your Kubernetes API server does not accept**.

## Configure scaler authentication

Create a `TriggerAuthentication` referencing the approved service account:

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: google-scaling
  namespace: payments
spec:
  podIdentity:
    provider: gcp-workload-service-account
    serviceAccountName: scaling-gcp
    # Optional IAM service-account impersonation:
    identityId: scaling-reader@application-project.iam.gserviceaccount.com
```

Reference it from a supported trigger in the same namespace:

```yaml
authenticationRef:
  name: google-scaling
```

The same `podIdentity` configuration works in a `ClusterTriggerAuthentication` referenced with `kind: ClusterTriggerAuthentication`. The service-account namespace **always** comes from the consuming `ScaledObject` or `ScaledJob`, including when using a `ClusterTriggerAuthentication`. `KEDA_CLUSTER_OBJECT_NAMESPACE` does not change this selection. A `ClusterTriggerAuthentication` referenced in `payments` and `reports` therefore resolves the account in each respective namespace, and each namespace/account pair requires separate administrator approval.

Changes to or deletion of a referenced `TriggerAuthentication` or `ClusterTriggerAuthentication` (such as rotating `serviceAccountName` or `identityId`) are detected automatically without editing the `ScaledObject` or `ScaledJob`; KEDA invalidates cached scalers and refuses to mint new tokens for the replaced identity. A missing authentication resource or an empty `authenticationRef.name` fails closed instead of falling back to unauthenticated or operator credentials.

## Delegation and credential handling

**Approval delegates the account's cloud identities to the namespace.** Users who can configure scaling resources and their authentication in that namespace can select any account approved for that namespace. KEDA does not check an individual authentication resource author's cloud entitlement or require the scale target's Pods to use the approved service account.

The authentication resource selects `serviceAccountName` and optionally `identityId`, but cannot override the namespace or audience. `identityId` is user-selected configuration, not an administrator-enforced restriction on which IAM service accounts the federated principal may impersonate. Review both the federated principal's direct IAM permissions and every Google IAM service account that grants it `roles/iam.workloadIdentityUser`.

Because `KEDA_CLOUD_WORKLOAD_IDENTITY_AUDIENCES` is isolated from `KEDA_SERVICE_ACCOUNT_TOKEN_AUDIENCES`, approving a service account only in `cloudWorkloadIdentityTokenCreationRoles` (or `KEDA_CLOUD_WORKLOAD_IDENTITY_AUDIENCES`) prevents generic `boundServiceAccountToken` and Vault authentication from minting tokens for it. Use dedicated service accounts for cloud federation and do not also approve them in `serviceAccountTokenCreationRoles` or `KEDA_SERVICE_ACCOUNT_TOKEN_AUDIENCES`.

During token exchange, KEDA sends Kubernetes assertions only to Google STS (`https://sts.googleapis.com/v1/token`), performs optional impersonation only against Google IAM Credentials, and rejects HTTP redirects on credential exchanges. When token minting or exchange fails, KEDA fails closed and does not fall back to operator credentials, metadata servers, or ambient `GOOGLE_APPLICATION_CREDENTIALS`.

For HTTP-based scalers (`gcp-storage` and `prometheus`), KEDA allows redirects only within the original origin (the same scheme, hostname, and effective port); cross-origin redirects and HTTPS-to-HTTP downgrades fail before credentials are sent. For `prometheus`, `serverAddress` is additionally restricted to `https://monitoring.googleapis.com` (with optional `:443`) and TLS certificate verification is enforced (`unsafeSsl: "true"` is rejected).

Removing an approval from `cloudWorkloadIdentityTokenCreationRoles` or `KEDA_CLOUD_WORKLOAD_IDENTITY_AUDIENCES` stops subsequent token minting once the updated configuration is applied to the operator. It does not invalidate Kubernetes assertions (10-minute TTL) or exchanged Google access tokens that were already issued; those can remain valid until expiry. Follow Google Cloud's IAM revocation procedures when immediate revocation is required.

## Supported scalers and combinations

`gcp-workload-service-account` is supported on the following scalers:

- [`gcp-pubsub`](../../scalers/gcp-pub-sub/): requires the full `projects/PROJECT/subscriptions/NAME` or `projects/PROJECT/topics/NAME` path.
- [`gcp-spanner`](../../scalers/gcp-spanner/): uses the Spanner data scope only, with SDK native metrics disabled.
- [`gcp-stackdriver`](../../scalers/gcp-stackdriver/)
- [`gcp-storage`](../../scalers/gcp-storage/): uses explicit credentials with SDK client metrics disabled and same-origin redirects only.
- [`prometheus`](../../scalers/prometheus/#google-managed-service-for-prometheus): pinned to Google Cloud Managed Service for Prometheus (`https://monitoring.googleapis.com`) with TLS verification required and same-origin redirects only.

All other scalers (including deprecated `gcp-cloudtasks`) reject `gcp-workload-service-account` and fail closed.

Workload service account selection is supported only in top-level `spec.podIdentity`. Nested secret-provider authentication blocks (`gcpSecretManager.podIdentity`, `azureKeyVault.podIdentity`, and `awsSecretManager.podIdentity`) reject both `serviceAccountName` and `gcp-workload-service-account`. It also cannot be combined with `azureServicePrincipal` or competing scaler authentication modes such as Prometheus `authModes`.
