+++
title = "Workload service accounts"
weight = 510
+++

KEDA can authenticate a scaler using a Kubernetes service account in the namespace of its ScaledObject or ScaledJob. Select one of the workload service account providers below and set `spec.podIdentity.serviceAccountName` in the TriggerAuthentication or ClusterTriggerAuthentication. KEDA requests a short-lived token for that account, exchanges it with the cloud identity service, and refreshes the resulting cloud credentials as needed.

The selected account does not need to be the account used by the application's Pods. These providers require `serviceAccountName`. The existing `gcp`, `azure-workload`, `aws`, and `aws-eks` providers retain their behavior and reject this field.

| Provider | Fields used with `serviceAccountName` | Administrator-approved token audience |
| --- | --- | --- |
| [GCP](../../authentication-providers/gcp-workload-identity/#select-a-workload-service-account) (`gcp-workload-service-account`) | Optional `identityId`: Google IAM service-account email for impersonation | Canonical IAM workload identity pool/provider resource |
| [Azure](../../authentication-providers/azure-ad-workload-identity/#select-a-workload-service-account) (`azure-workload-service-account`) | Required `identityId`: client ID; required `identityTenantId`: tenant ID | `api://AzureADTokenExchange` |
| [AWS](../../authentication-providers/aws/#select-a-workload-service-account) (`aws-workload-service-account`) | Required `roleArn`: IAM role to assume | `sts.amazonaws.com` |

## Administrator setup

Configure the cloud provider to trust your cluster's exact OIDC issuer, Kubernetes subject `system:serviceaccount:NAMESPACE:SERVICE_ACCOUNT`, and intended audience. Use dedicated service accounts and grant only the cloud permissions needed by the scaler. Every cloud identity that accepts that issuer, subject, and audience is part of the delegation to the namespace, as explained under [delegation and credential handling](#delegation-and-credential-handling). Follow the linked provider guides for the cloud-specific trust configuration.

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

**Approval delegates the full identity to the namespace.** Users who can configure scaling resources and their authentication there can select its approved accounts. KEDA does not check the individual authentication resource author's entitlement to a cloud identity or require the scale target's Pods to use the account.

The audience mapping and token-creation RBAC are shared with [generic `boundServiceAccountToken`](../../authentication-providers/bound-service-account-token/) and Vault `credential.serviceAccountName` authentication. A user can select the same account through generic BSAT authentication and send the raw Kubernetes federation JWT to a metrics endpoint they control. Vault also uses this mapping, subject to any configured [Vault destination filter](../../operate/security/#restrict-vault-destinations). Approval does not keep assertions inside KEDA or restrict their use to scaling.

The authentication resource selects an account name but cannot override its namespace or audience. Its `roleArn` or `identityId` is not an administrator-enforced restriction on which cloud identity the assertion can access. For example, an exported AWS assertion can assume any IAM role whose trust policy accepts its issuer, subject, and audience, regardless of the `roleArn` in the authentication resource. Review all cloud trust relationships and permissions for an approved account, and grant only privileges that namespace users may exercise outside KEDA as well.

Within the workload service account provider's exchange flow, KEDA sends the Kubernetes assertion only to supported cloud token-exchange endpoints and rejects redirects. This protects that exchange; it does not constrain the generic BSAT or Vault paths above. When minting or exchange fails in the cloud flow, KEDA does not fall back to operator credentials, local CLI credentials, or operator-mounted tokens.

Cloud credentials are used by the configured scaler. For example, Prometheus sends its cloud authentication to the configured metrics endpoint, so that endpoint must be trusted to receive the credential. Use HTTPS with certificate verification. Network and admission policies can further restrict destinations and who may configure them.

With workload service account providers, the HTTP clients used by Prometheus, GCP Storage, and Azure scalers allow redirects only within the original origin: the same scheme, hostname, and effective port. Cross-origin redirects, including HTTPS-to-HTTP downgrades, fail before credentials are sent to the redirect target. These protections do not restrict the initially configured endpoint or replace TLS certificate validation.

Removing approval prevents subsequent token minting once the changed configuration has been applied to the operator. It does not invalidate Kubernetes assertions or cloud credentials that have already been issued; they can remain valid until expiry, and an unexpired assertion may still be exchanged. Follow your cloud provider's revocation procedures when immediate revocation is required.

## Supported combinations

Selection is supported only in top-level `spec.podIdentity`. Nested secret-provider authentication, including `gcpSecretManager.podIdentity`, `azureKeyVault.podIdentity`, and `awsSecretManager.podIdentity`, rejects both `serviceAccountName` and the workload service account providers. Selected-account authentication also cannot be combined with `azureServicePrincipal`.

Existing scaler metadata requirements still apply. Competing authentication methods such as Prometheus `authModes`, Cosmos DB connection strings/account keys, and an Azure Pipelines personal access token are rejected with selected-account authentication. Kafka scalers require their AWS MSK IAM authentication mode when selecting an AWS service account. See the provider pages for further requirements and limitations.
