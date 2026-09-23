+++
title = "Bound service account token"
+++

A `boundServiceAccountToken` entry supplies a short-lived Kubernetes service account token as an authentication parameter. The parameter name is defined by the scaler, for example `bearerToken` for metrics-api or `token` for Datadog Cluster Agent.

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: metrics-auth
  namespace: apps
spec:
  boundServiceAccountToken:
    - parameter: bearerToken
      serviceAccountName: metrics-reader
```

For a TriggerAuthentication, the service account is resolved in that authentication's namespace. For a ClusterTriggerAuthentication, it is resolved in `KEDA_CLUSTER_OBJECT_NAMESPACE`, defaulting to the operator's namespace. It is not automatically the namespace of each referencing workload. Vault's separate `credential.serviceAccountName` path continues to use the referencing ScaledObject/ScaledJob namespace.

## Audience and permissions

Starting in KEDA 2.21, token minting requires an operator-configured audience mapping **as well as** RBAC. The TA/CTA cannot select its audience. Use a dedicated audience accepted by the receiver but not by your Kubernetes API server.

With the upstream chart:

```yaml
operator:
  serviceAccountTokens:
    mode: enforce-audience
permissions:
  operator:
    restrict:
      serviceAccountTokenCreationRoles:
        - name: metrics-reader
          namespace: apps
          audience: metrics-api
```

Create `apps/metrics-reader` separately before the Helm upgrade. This value creates a Role/RoleBinding allowing the operator to `create` `serviceaccounts/token` for only that named service account, and supplies its exact audience mapping through `KEDA_SERVICE_ACCOUNT_TOKEN_AUDIENCES`. It does not create a service account or grant that account permission to read metrics.

The receiver must separately authorize the service account for its operation. For example, a receiver using SubjectAccessReview may require Kubernetes RBAC to read its metrics resource or URL.

An entry without `audience` renders the existing RBAC only; token minting fails in enforce mode unless a mapping is supplied separately. `allowAllServiceAccountTokenCreation` does not bypass the audience policy and grants much broader permissions than needed here. Do not enable it as a migration workaround.

Only one audience mapping is permitted for each namespace/service-account pair. Each TokenRequest uses that audience, not the union of all configured audiences. Use separate service accounts for receivers that need different audiences. `hashiCorpVault.kubernetesAuth.audience` configures an operator-Pod token projection, not a minting default.

For externally managed RBAC, you can instead supply an exact mapping directly through the environment. Clear the chart's default Vault audience and any other native audience settings when using this alternative:

```yaml
hashiCorpVault:
  kubernetesAuth:
    audience: ""
operator:
  serviceAccountTokens:
    additionalAllowedAudiences: []
env:
  - name: KEDA_SERVICE_ACCOUNT_TOKEN_AUDIENCES
    value: |
      - namespace: apps
        serviceAccountName: metrics-reader
        audience: metrics-api
```

This example creates neither RBAC nor a Vault token projection. The minimum token-creation permission remains a namespaced Role with `resources: ["serviceaccounts/token"]`, `verbs: ["create"]`, and `resourceNames: ["metrics-reader"]`, bound to the operator's service account. Review the [runtime configuration](../../operate/security/#runtime-configuration) for existing native audience settings, and the [global audience policy](../../operate/security/#approved-audiences-and-token-minting): minting entries also approve their audiences for Vault file tokens and are not per-scaler or per-destination isolation.

## Receiver requirements

Minting a token with a custom audience is only half of the configuration. The receiver must verify that audience.

For a receiver that delegates authentication to Kubernetes, set `spec.audiences` in its TokenReview:

```yaml
apiVersion: authentication.k8s.io/v1
kind: TokenReview
spec:
  audiences:
    - metrics-api
  token: "<token received from KEDA>"
```

The receiver must require `status.authenticated: true` and check that `status.audiences` includes `metrics-api`, then apply its normal authorization checks. It submits TokenReview using its **own API-valid credential**, not the caller's token. If `spec.audiences` is omitted, TokenReview defaults to the Kubernetes API audience. See [Kubernetes authentication](https://kubernetes.io/docs/reference/access-authn-authz/authentication/#webhook-token-authentication).

This applies to any scaler supplied with a BSAT, including metrics-api, Prometheus, Loki, and the Datadog Cluster Agent path. Receivers using other verification methods must likewise accept and validate the selected audience. Ordinary API keys, OAuth access tokens, and other non-BSAT credentials are not changed by this feature.

For Datadog Cluster Agent, verify audience support in the **external-metrics endpoint** of the deployed version before changing KEDA. Do not assume a Datadog chart value or a generic API-server flag exposes that setting. If the receiver cannot accept a dedicated audience, KEDA configuration alone cannot complete the secure migration. Options include adding receiver support, using [Datadog REST API authentication](../../scalers/datadog/), or explicitly accepting temporary legacy behavior.

## Upgrading existing integrations

Follow the [2.21 migration guide](../../migration/#service-account-token-audiences) before upgrading. Missing mappings fail the affected scaler even if the KEDA Deployment is healthy.

`operator.serviceAccountTokens.mode: legacy` restores minting without an explicit audience and logs warnings. It is a global, insecure compatibility option shared with Vault, not a per-BSAT exception. It cannot be combined with configured audience entries. See [temporary legacy compatibility](../../migration/#temporary-legacy-compatibility) for the values that must be removed.
