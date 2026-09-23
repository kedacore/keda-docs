+++
title = "Security"
description = "Guidance to configure security options"
weight = 100
+++

## Service account token audiences

KEDA 2.21 requires operator-configured audiences for Vault Kubernetes authentication and all `boundServiceAccountToken` minting. This separates credentials forwarded to external services from credentials accepted by the Kubernetes API. Choose audiences that **your Kubernetes API server does not accept**. KEDA does not infer or block API audiences: explicitly approving one forfeits protection against replay to that API server.

The default `operator.serviceAccountTokens.mode: enforce-audience` applies even when no audience settings are supplied. The chart projects and approves a token with audience `vault` at `/var/run/secrets/keda-vault/token` by default; it does not create token-creation RBAC or named-service-account audience mappings. Missing approvals or minting mappings fail the affected authentication without an API-token fallback. Unrelated authentication methods, including Vault's ordinary token authentication, do not acquire a service-account audience requirement.

See the [2.21 migration guide](../../migration/#service-account-token-audiences) before upgrading.

### Approved audiences and token minting

| Token source | Configuration | Behavior |
| --- | --- | --- |
| Operator Pod's dedicated Vault projection | `hashiCorpVault.kubernetesAuth.audience` | Creates a projected token and approves its audience; does not configure named-SA minting |
| Separately mounted token files | `operator.serviceAccountTokens.additionalAllowedAudiences` | Approves audiences only; creates no volumes or minting mappings |
| Vault `credential.serviceAccountName` or generic `boundServiceAccountToken` | `permissions.operator.restrict.serviceAccountTokenCreationRoles[].audience` | Configures the audience for an exact namespace/service-account pair and creates scoped token-creation RBAC |

Prefer native chart values, for example (audience enforcement is the default):

```yaml
operator:
  serviceAccountTokens:
    additionalAllowedAudiences: []
hashiCorpVault:
  kubernetesAuth:
    audience: vault
    projectedTokenMountPath: /var/run/secrets/keda-vault
permissions:
  operator:
    restrict:
      serviceAccountTokenCreationRoles:
        - name: metrics-reader
          namespace: apps
          audience: metrics-api
```

For Vault file tokens, KEDA requires a service-account subject, valid lifetime with an expiry, and a nonempty audience claim. **Every** audience in the token must be approved. Adding one approved audience to a token that also contains an unapproved audience does not make it acceptable. This is an outgoing-credential check, not signature verification; the recipient must still authenticate the token.

All configured audiences, including a custom `hashiCorpVault.kubernetesAuth.audience` and minting mappings, enter the same global approval set for file tokens. Do not repeat these audiences in `additionalAllowedAudiences`. A TokenRequest instead requests only the audience mapped to that exact service account. There is no TA/CTA audience override and no implicit minting default. Use separate, least-privilege service accounts if minting needs different audiences.

For receivers requiring an API audience, see [Datadog Audience Compatibility](../../scalers/datadog/#datadog-audience-compatibility) and its security caveat.

The allowed set is not a per-tenant or per-destination permission system. A token approved for one service can still be forwarded through another permitted authentication path if resource and credential access allow it. Keep least-privilege service accounts, receiver authorization, [RBAC restrictions](../cluster/#restrict-custom-resources), and admission or network policies where isolation is needed. This policy does not inspect arbitrary Secret values, other file-based credentials, or cloud SDK credentials.

### Vault token files

The chart-generated token belongs to the **operator Pod's service account**, including a custom operator service account. The kubelet obtains and rotates it; the operator needs no additional TokenRequest RBAC. Its own Kubernetes API token remains unchanged. See [Kubernetes token projection](https://kubernetes.io/docs/concepts/storage/projected-volumes/#serviceaccounttoken-projected-volumes).

The generated file is `<projectedTokenMountPath>/token`, normally `/var/run/secrets/keda-vault/token`. Omit the entire Vault `credential` object to select it. An explicit `credential.serviceAccount` continues to select that exact file, subject to audience validation. An empty `credential: {}` does not select the default.

An empty or null `projectedTokenMountPath` disables the chart projection and implicit file selection while retaining the audience approval. It does not disable checks on explicitly selected files or token minting. Additional mounts remain under `volumes.keda.extraVolumes` and `extraVolumeMounts`; their audiences are **not** rewritten or automatically approved. Secret, CSI, or other volumes can supply a token if the actual token meets the same requirements. Old non-expiring service-account-token Secrets do not. Do not put credentials in ConfigMaps or use `subPath` for rotating tokens.

KEDA rereads token files for each Vault login. Missing, expired, or unapproved tokens fail that authentication. The chart rejects generated volume-name collisions and overlapping generated mount paths with known operator mounts; it cannot predict mounts injected later by admission webhooks.

Vault must accept the configured login audience and use a **separate API-valid credential** for TokenReview. When Vault runs in Kubernetes, its own service account can be the reviewer with the appropriate permissions. Do not make the login token API-valid to let Vault reuse it as its reviewer. See [Vault's reviewer configuration](https://developer.hashicorp.com/vault/docs/auth/kubernetes#how-to-work-with-short-lived-kubernetes-tokens).

### Minted tokens and receivers

Vault named-SA authentication and generic BSAT authentication use the same audience mapping and TokenRequest implementation. Existing token-creation RBAC is still required; the audience policy does not grant permissions by itself. Scope `create` on `serviceaccounts/token` to named service accounts in the required namespaces. `allowAllServiceAccountTokenCreation: true` instead grants this permission for any service account in any namespace, but does not create audience mappings or bypass enforcement. Kubernetes RBAC does not constrain the audience in a TokenRequest.

Generic BSATs use the TA namespace, or the configured cluster-object namespace for a CTA. Vault `credential.serviceAccountName` uses the referencing ScaledObject/ScaledJob namespace, including when the Vault configuration is in a CTA. Configure mappings for the namespace actually used by that path.

A receiver that uses Kubernetes TokenReview must request its dedicated audience and check that the authenticated response includes it. Omitting `spec.audiences` asks about the API server's audience, not the dedicated service audience. The receiver uses its own API-valid credential to submit TokenReview and must retain its authorization checks. Changing only KEDA's minting configuration is insufficient. See the [BSAT provider guide](../../authentication-providers/bound-service-account-token/#receiver-requirements), including Datadog Cluster Agent compatibility.

### Runtime configuration

The chart serializes approvals and minting mappings into `KEDA_SERVICE_ACCOUNT_TOKEN_AUDIENCES`. When managing this environment variable directly instead, clear the chart's default Vault audience and any other native audience settings:

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
      - audience: vault
      - audience: metrics-api
        namespace: apps
        serviceAccountName: metrics-reader
```

Every entry approves an audience for file tokens. An entry with both `namespace` and `serviceAccountName` also maps minting for that service account; providing just one of those fields is invalid. Duplicate mappings are rejected. The chart's existing role entry uses `name`, which it translates to `serviceAccountName` in this environment variable.

Use this raw environment form when RBAC or volumes are managed separately. Remove `audience` fields from any `serviceAccountTokenCreationRoles` entries while retaining the required RBAC. This example creates no token permissions or volumes: a Vault file token must be mounted separately and selected through `credential.serviceAccount`. Prefer native chart values unless you need this direct configuration.

The runtime accepts one YAML or JSON document; unknown fields and malformed configuration fail startup. The chart limits its generated value to 64 KiB. Changes require an operator rollout.

`--service-account-token-mode` defaults to `enforce-audience`; `legacy` is the explicit insecure bypass for both Vault and BSAT. `--vault-kubernetes-auth-token-file` selects the implicit Vault file, defaulting to `/var/run/secrets/keda-vault/token`; it does not set minting audiences. Prefer native chart values for these options. See [temporary compatibility](../../migration/#temporary-legacy-compatibility) before using legacy mode.

## Restrict Vault destinations

Outbound filtering is independent, optional hardening. Audience binding limits where a leaked token can be accepted; it does not prevent a tenant-selected endpoint from receiving an approved token.

```yaml
operator:
  outboundFilter:
    hashiCorpVault:
      mode: enforce
      allowedEndpoints:
        - https://vault.example:8200
```

- `"off"` (default): ignore the allowlist and log an informational startup message, without per-destination warnings.
- `warn`: allow requests and log a warning for each unlisted destination.
- `enforce`: reject unlisted destinations before reading, minting, or sending credentials. An empty list rejects all Vault destinations, including ordinary Vault-token authentication.

Quote `"off"` in YAML to avoid boolean conversion by some parsers. Setting `allowedEndpoints` alone does not enable filtering. Turning filtering off does not disable audience enforcement.

The chart serializes this object into the operator-only `KEDA_OUTBOUND_FILTER` environment variable, accepting the same YAML or JSON structure for direct configuration. An absent value, empty object, or omitted mode selects `off`. Invalid modes, duplicate keys, unknown fields, and malformed documents fail startup. The chart limits the generated value to 64 KiB. Changes require an operator rollout.

Only HashiCorp Vault uses this filter in 2.21. It does not filter metrics-api, Prometheus, Datadog, Azure Key Vault, or other scaler/provider destinations. Entries are HTTP(S) origins matched by scheme, host, and port, not URL prefixes, paths, wildcards, or CIDRs. Use the same explicit port as the Vault address: `https://vault.example` and `https://vault.example:443` are distinct entries. Prefer HTTPS with certificate verification.

The check trusts approved origins and their existing Vault SDK redirect behavior. It is not a complete network-egress or SSRF boundary. Use network and admission policies for stronger restrictions.

Warnings use KEDA's Info level with a `Warning:` prefix. Warn mode and legacy token mode warn at startup; each unlisted Vault use in warn mode, legacy Vault login, and legacy token mint logs a runtime warning. They are not rate-limited and do not create dedicated Warning Events. Existing scaler-failure Events remain available.

## Use your own TLS Certificates

KEDA uses self-signed certificates for different things. These certificates are generated and rotated by the operator. Certificates are stored in a Kubernetes secret (`kedaorg-certs`) that it's mounted to all KEDA components in the (default) path `/certs`. Generated files are named `tls.crt` and `tls.key` for TLS certificate and `ca.crt` and `ca.key` for CA certificate. KEDA also patches Kubernetes resources to include the `caBundle`, making Kubernetes to trust in the CA.

The KEDA operator is responsible for generating certificates for all the services, certificates are by default generated for following DNS names:
```
<KEDA_OPERATOR_SERVICE>                          -> eg. keda-operator
<KEDA_OPERATOR_SERVICE>.svc                      -> eg. keda-operator.svc
<KEDA_OPERATOR_SERVICE>.svc.<CLUSTER_DOMAIN>     -> eg. keda-operator.svc.cluster.local
```
To change the default cluster domain (`cluster.local`), parameter `--k8s-cluster-domain="my-domain"` on KEDA operator can be used. Helm Charts set this automatically from `clusterDomain` value.

While this is a good starting point, some end-users may want to use their own certificates which are generated from their own CA in order to improve security. This can be done by disabling the certificate generation/rotation in the operator and updating default values in other components (if required). 

Certificates generation in the KEDA operator can be disabled by removing the console argument `--enable-cert-rotation=true` or setting it to `false`. Once this setting is disabled, user given certs can be placed in the secret `kedaorg-certs` which is automatically mounted in all the components or they can be patched to use other secret (this can be done through helm values too).

Additionally, KEDA includes a new `--enable-webhook-patching` flag, which controls whether the operator patches webhook resources. By default, this is set to `true`, ensuring Kubernetes trusts the operator's CA. However, if webhooks are disabled or not needed in your deployment, you can set this flag to `false` to avoid errors related to missing webhook resources.

Example use case:
- When using operator-managed certificates but disabling webhooks, set `--enable-webhook-patching=false` to prevent the operator from attempting to patch non-existent webhook resources.

All components inspect the folder `/certs` for any certificates inside it. Argument `--cert-dir` can be used to specify another folder to be used as a source for certificates, this argument can be patched in the manifests or using Helm values. Because these certificates are also used for internal communication between KEDA components, the CA is also required to be registered as a trusted CA inside KEDA components.

## Register your own CA in KEDA Operator Trusted Store

There are use cases where we need to use self-signed CAs (cases like AWS where their CA isn't registered as trusted etc.). Some scalers allow skipping the cert validation by setting the `unsafeSsl` parameter, but this isn't ideal because it allows any certificate, which is not secure.

To overcome this problem, KEDA supports registering custom CAs to be used by SDKs where it is possible. To register custom CAs, place the certificates in a directory, then pass the directory to the KEDA operator using the `--ca-dir=` flag. By default, the KEDA operator looks in the `/custom/ca` directory.  Multiple directories can be specified by providing the `--ca-dir=` flag multiple times. KEDA will try to register as trusted CAs all certificates inside these directories. If using kustomize or helm, CA certificate directories can be specified via `certificates.operator.caDirs` and certificate volumes can be mounted using `volumes.keda.extraVolumes` and `volumes.keda.extraVolumeMounts`.
