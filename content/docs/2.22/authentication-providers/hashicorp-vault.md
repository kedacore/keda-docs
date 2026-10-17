+++
title = "Hashicorp Vault secret"
+++


You can pull one or more Hashicorp Vault secrets into the trigger by defining the authentication metadata such as Vault `address` and the `authentication` method (token | kubernetes). If you choose kubernetes auth method you should provide `role` and `mount` as well.
`credential` defines the Hashicorp Vault credentials depending on the authentication method. For Kubernetes authentication, omit it to use the operator's dedicated Vault token projection, provide `serviceAccount` with a token-file path, or provide `serviceAccountName` to mint a token in the referencing ScaledObject/ScaledJob namespace. Named-service-account minting requires a namespaced Role granting `create` on `serviceaccounts/token`, restricted to the intended service account through `resourceNames`; the default projected-token path requires no additional TokenRequest RBAC. For token authentication, provide the Vault token.
`secrets` list defines the mapping between the path and the key of the secret in Vault to the parameter.
`namespace` may be used to target a given Vault Enterprise namespace.

KEDA 2.21 requires operator-approved audiences for Kubernetes authentication by default. The chart projects a token with `hashiCorpVault.kubernetesAuth.audience: vault` at `/var/run/secrets/keda-vault/token`. Configure the Vault role to accept `vault`, or change the chart value to match your intended Vault audience. The chart automatically approves this audience, including a custom value; do not repeat it in `operator.serviceAccountTokens.additionalAllowedAudiences`. Use that list for extra file-token audiences not already configured through native chart values. Every audience in a selected token must be approved.

Named-SA minting instead requires an exact namespace/name/audience entry in `permissions.operator.restrict.serviceAccountTokenCreationRoles`, shared with generic BSAT authentication. The projection's audience is not a minting default. Choose audiences not accepted by kube-apiserver; there is no TA audience override or API-token fallback.

The default mode is `operator.serviceAccountTokens.mode: enforce-audience`. Its explicit `legacy` escape hatch disables the audience protection for **both Vault and BSAT**. Vault must use a separate API-valid credential for TokenReview, such as its own Pod's service account with reviewer permissions. Reusing the dedicated login token as the reviewer will fail, because it is not intended for the Kubernetes API. See the [migration guide](../../migration/#service-account-token-audiences) and [token security configuration](../../operate/security/#service-account-token-audiences).

The optional `operator.outboundFilter.hashiCorpVault` policy applies to all Vault authentication methods, including ordinary Vault tokens. It is independent of the audience policy and defaults to `off`.

> Since version `1.5.0` Vault secrets backend **version 2** is supported. 
> The support for Vault secrets backend **version 1** was added on version `2.10`.

```yaml
hashiCorpVault:                                               # Optional.
  address: {hashicorp-vault-address}                          # Required.
  namespace: {hashicorp-vault-namespace}                      # Optional. Default is root namespace. Useful for Vault Enterprise
  authentication: token | kubernetes                          # Required.
  role: {hashicorp-vault-role}                                # Optional.
  mount: {hashicorp-vault-mount}                              # Optional.
  credential:                                                 # Optional.
    token: {hashicorp-vault-token}                            # Optional. Authenticate to vault via a supplied token
    serviceAccount: {path-to-service-account-file}            # Optional. Authenticate to vault via JWT token in keda operator pod
    serviceAccountName: {service-account-name-for-auth}       # Optional. Requires serviceaccounts/token create permissions. Authenticate to vault via JWT token from service account in ScaledObject/ScaledJob's namespace
  secrets:                                                    # Required.
  - parameter: {scaledObject-parameter-name}                  # Required.
    key: {hashicorp-vault-secret-key-name}                    # Required.
    path: {hashicorp-vault-secret-path}                       # Required.
    type: {hashicorp-vault-secret-type}                       # Optional. Default to `""`. Allowed values: `secret`, `secretV2`, `pki`
    pkidata: {hashicorp-vault-secret-pkidata}                 # Optional. Data to be send with the secret  if `hashicorp-vault-secret-type` is pki request
      commonName: {hashicorp-vault-secret-pkidata-commonName} # Optional.
      altNames: {hashicorp-vault-secret-pkidata-altNames}     # Optional.
      ipSans: {hashicorp-vault-secret-pkidata-ipSans}         # Optional.
      uriSans: {hashicorp-vault-secret-pkidata-uriSans}       # Optional.
      otherSans: {hashicorp-vault-secret-pkidata-otherSans}   # Optional.
      ttl: {hashicorp-vault-secret-pkidata-ttl}               # Optional.
      format: {hashicorp-vault-secret-pkidata-format}         # Optional.
```

### Example
Vault Secret can be used to provide authentication for a Scaler. If using the [Prometheus scaler](https://keda.sh/docs/2.3/scalers/prometheus/), mTls can be used by the `ScaledObject` to authenticate to the Prometheus server. The following example would request a certificate to Vault dynamically.
```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: {trigger-authentication-mame}
  namespace: default
spec:
  hashiCorpVault:
    address: {hashicorp-vault-address}
    authentication: token
    credential:
      token: {hashicorp-vault-token}
    secrets:
      - key: "ca_chain"
        parameter: "ca"
        path: {hashicorp-vault-secret-path}
        type: pki
        pki_data:
          common_name: {hashicorp-vault-secret-pkidata-commonName}
      - key: "private_key"
        parameter: "key"
        path: {hashicorp-vault-secret-path}
        type: pki
        pki_data:
          common_name: {hashicorp-vault-secret-pkidata-commonName}
      - key: "certificate"
        parameter: "cert"
        path: {hashicorp-vault-secret-path}
        type: pki
        pki_data:
          common_name: {hashicorp-vault-secret-pkidata-commonName}
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: {scaled-object-name}
  namespace: default
spec:
  scaleTargetRef:
    name: {deployment-name}
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://<prometheus-host>:9090
        query: sum(rate(http_requests_total{deployment="my-deployment"}[2m]))
        authModes: "tls"
      authenticationRef:
        name: { trigger-authentication-mame }
```
