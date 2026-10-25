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

Starting in KEDA 2.21, token minting requires an operator-configured audience mapping **as well as** RBAC by default. The TA/CTA cannot select its audience. Use a dedicated service account and a receiver-specific audience not accepted by your Kubernetes API server, granting only the permissions the receiver needs. See [Kubernetes service account guidance](https://kubernetes.io/docs/concepts/security/service-accounts/).

Prefer the native chart values below. These examples use the default `operator.serviceAccountTokens.mode: enforce-audience`; if you previously selected `legacy`, change it back when the receiver is ready.

```yaml
permissions:
  operator:
    restrict:
      serviceAccountTokenCreationRoles:
        - name: metrics-reader
          namespace: apps
          audience: metrics-api
```

Create the namespace and service account `apps/metrics-reader` separately. The chart creates a Role/RoleBinding allowing the operator to `create` `serviceaccounts/token` for that named service account and supplies its audience mapping through `KEDA_SERVICE_ACCOUNT_TOKEN_AUDIENCES`. It does not create the service account or grant it permission to read metrics.

The receiver must separately authorize the service account for its operation. For example, a receiver using SubjectAccessReview may require Kubernetes RBAC to read its metrics resource or URL.

An entry without `audience` renders the existing RBAC only; token minting fails in enforce mode unless a mapping is supplied separately.

`permissions.operator.restrict.allowAllServiceAccountTokenCreation: true` grants token-creation RBAC for **any service account in any namespace**. Enforce mode still requires an exact audience mapping for each service account; `additionalAllowedAudiences` alone is not a minting mapping. Do not enable broad token-creation RBAC as a migration workaround.

Only one audience mapping is permitted for each namespace/service-account pair. Each TokenRequest uses that audience, not the union of all configured audiences. Use separate service accounts for receivers that need different audiences. `hashiCorpVault.kubernetesAuth.audience` configures an operator-Pod token projection, not a minting default.

For externally managed RBAC, the low-level `KEDA_SERVICE_ACCOUNT_TOKEN_AUDIENCES` environment variable can supply the mapping instead. Use the complete [runtime configuration example](../../operate/security/#runtime-configuration): raw environment configuration cannot be combined with native audience values, including the chart's default Vault audience. It creates no RBAC or volumes. The minimum minting permission is a namespaced Role with `resources: ["serviceaccounts/token"]`, `verbs: ["create"]`, and `resourceNames: ["metrics-reader"]`, bound to the operator's service account.

Minting entries also approve their audiences for Vault file tokens. They are not per-scaler or per-destination isolation; see the [global audience policy](../../operate/security/#approved-audiences-and-token-minting).

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

The receiver must require `status.authenticated: true` and check that `status.audiences` includes `metrics-api`, then apply its normal authorization checks. It submits TokenReview using its **own API-valid credential**, not the caller's token. If `spec.audiences` is omitted, TokenReview defaults to the Kubernetes API audience. See the [TokenReview API](https://kubernetes.io/docs/reference/kubernetes-api/authentication-resources/token-review-v1/).

This applies to any scaler supplied with a BSAT, including metrics-api, Prometheus, Loki, and the Datadog Cluster Agent path. Receivers using other verification methods must likewise accept and validate the selected audience. Ordinary API keys, OAuth access tokens, and other non-BSAT credentials are not changed by this feature.

For an endpoint protected by [kube-rbac-proxy](https://github.com/kube-rbac-proxy/kube-rbac-proxy#usage), configure the proxy's `--auth-token-audiences=metrics-api` to match this example. Keep the proxy's TokenReview/SubjectAccessReview permissions and the caller's authorization rules. Prometheus and Loki bearer-token deployments need audience support in their authentication proxy or gateway, not just a KEDA value.

**Datadog Cluster Agent compatibility:** the unmodified Cluster Agent **7.83.2** external-metrics server uses Kubernetes delegated authentication without a configurable token audience. Its configuration passes flags to the metrics adapter, but that adapter does not expose an `api-audiences` option. A dedicated non-API audience therefore does not work merely by adding a KEDA mapping. See the [Datadog server](https://github.com/DataDog/datadog-agent/blob/7.83.2/cmd/cluster-agent/custommetrics/server.go) and its [delegated-authentication options](https://github.com/kubernetes/apiserver/blob/v0.35.5/pkg/server/options/authentication.go). Check newer versions for explicit receiver support before choosing a BSAT migration.

For that integration, use [Datadog REST API authentication](../../scalers/datadog/) or obtain receiver support. Alternatively, [Datadog Audience Compatibility](../../scalers/datadog/#datadog-audience-compatibility) keeps enforcement enabled with an API-audience BSAT and a metrics-only service account; review its security caveat before choosing this option. REST authentication uses API/app keys and a Datadog query instead of the Cluster Agent's DatadogMetric lookup, so review query results and API rate limits. Neither a long-lived API-valid token Secret nor an approved API audience provides dedicated-audience protection.

## Upgrading existing integrations

Follow the [2.21 migration guide](../../migration/#service-account-token-audiences) before upgrading. Missing mappings fail the affected scaler even if the KEDA Deployment is healthy.

`operator.serviceAccountTokens.mode: legacy` restores minting without an explicit audience and logs warnings. It is a global, insecure compatibility option shared with Vault, not a per-BSAT exception. It cannot be combined with configured audience entries. See [temporary legacy compatibility](../../migration/#temporary-legacy-compatibility) for the values that must be removed.
