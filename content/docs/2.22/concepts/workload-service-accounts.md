+++
title = "Workload service accounts"
weight = 510
+++

KEDA can authenticate a scaler using a Kubernetes service account in the namespace of its ScaledObject or ScaledJob. Set `spec.podIdentity.serviceAccountName` in the TriggerAuthentication or ClusterTriggerAuthentication. KEDA requests a short-lived token for that account, exchanges it with the cloud identity service, and refreshes the resulting cloud credentials as needed.

The selected account does not need to be the account used by the application's Pods. Omitting `serviceAccountName` retains the existing provider behavior.

| Provider | Fields used with `serviceAccountName` | Administrator-approved token audience |
| --- | --- | --- |
| [GCP](../../authentication-providers/gcp-workload-identity/#select-a-workload-service-account) (`gcp`) | Optional `identityId`: Google IAM service-account email for impersonation | Canonical IAM workload identity pool/provider resource |
| [Azure](../../authentication-providers/azure-ad-workload-identity/#select-a-workload-service-account) (`azure-workload`) | Required `identityId`: client ID; required `identityTenantId`: tenant ID | `api://AzureADTokenExchange` |
| [AWS](../../authentication-providers/aws/#select-a-workload-service-account) (`aws`) | Required `roleArn`: IAM role to assume | `sts.amazonaws.com` |

## Administrator setup

Configure the cloud provider to trust your cluster's OIDC issuer and the exact Kubernetes subject `system:serviceaccount:NAMESPACE:SERVICE_ACCOUNT`. Grant only the cloud permissions needed by the scaler. Follow the linked provider guides for the cloud-specific trust configuration.

Create the service accounts in the workload namespace. For example:

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
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: scaling-azure
  namespace: payments
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: scaling-aws
  namespace: payments
```

Approve each exact namespace/account and its audience in the KEDA Helm installation:

```yaml
operator:
  serviceAccountTokens:
    mode: enforce-audience
permissions:
  operator:
    restrict:
      serviceAccountTokenCreationRoles:
        - name: scaling-gcp
          namespace: payments
          audience: https://iam.googleapis.com/projects/123456789012/locations/global/workloadIdentityPools/kubernetes/providers/production-cluster
        - name: scaling-azure
          namespace: payments
          audience: api://AzureADTokenExchange
        - name: scaling-aws
          namespace: payments
          audience: sts.amazonaws.com
```

Replace the example Google project number, pool, and provider with your configured provider. The chart grants token-creation RBAC for these accounts and passes the audience mappings to the operator. When managing RBAC and runtime configuration separately, configure both as described in [service account token audiences](../../operate/security/#approved-audiences-and-token-minting).

A global audience approval without the exact namespace/account mapping is insufficient. `legacy` token mode is unsupported for explicit account selection. Each namespace/account supports one audience; use separate accounts for different cloud providers. Choose audiences that **your Kubernetes API server does not accept**.

## Configure scaler authentication

Create a TriggerAuthentication with the provider-specific fields listed above, then reference it in the scaler's trigger. For example, using the [AWS configuration](../../authentication-providers/aws/#select-a-workload-service-account):

```yaml
authenticationRef:
  name: aws-scaling
```

The same `podIdentity` configuration works in a ClusterTriggerAuthentication. Reference it with `kind: ClusterTriggerAuthentication`. The service-account namespace always comes from the consuming ScaledObject or ScaledJob, including when a cluster authentication is used. A cluster authentication referenced in `payments` and `reports` therefore selects an account in each respective namespace, and each namespace/account pair needs separate administrator approval.

## Delegation and credential handling

**Approval delegates the identity to the namespace.** Users who can configure scaling resources and their authentication there can select its approved accounts. KEDA does not check the individual authentication resource author's entitlement to a cloud identity or require the scale target's Pods to use the account. Restrict cloud IAM grants and Kubernetes permissions accordingly.

The authentication resource selects the account name, but cannot override its namespace or audience. KEDA sends the Kubernetes assertion only to the supported cloud token-exchange endpoints and rejects redirects. When token minting or exchange fails, KEDA does not fall back to operator credentials, local CLI credentials, or operator-mounted tokens.

Cloud credentials are used by the configured scaler. For example, Prometheus sends its cloud authentication to the configured metrics endpoint. Approval should grant only privileges that users configuring that scaler may exercise.

Removing approval prevents subsequent token minting once the changed configuration has been applied to the operator. Previously issued cloud credentials can remain valid until they expire.

## Supported combinations

Selection is supported only in top-level `spec.podIdentity`. Nested secret-provider authentication, including `gcpSecretManager.podIdentity`, `azureKeyVault.podIdentity`, and `awsSecretManager.podIdentity`, rejects `serviceAccountName`. It also cannot be combined with `azureServicePrincipal`.

Existing scaler metadata requirements still apply. Competing authentication methods such as Prometheus `authModes`, Cosmos DB connection strings/account keys, and an Azure Pipelines personal access token are rejected with selected-account authentication. Kafka scalers require their AWS MSK IAM authentication mode when selecting an AWS service account. See the provider pages for further requirements and limitations.
