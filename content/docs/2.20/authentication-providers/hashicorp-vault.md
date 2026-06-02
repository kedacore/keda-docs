+++
title = "Hashicorp Vault secret"
+++


You can pull one or more Hashicorp Vault secrets into the trigger by defining the authentication metadata such as Vault `address` and the `authentication` method (token | kubernetes). If you choose kubernetes auth method you should provide `role` and `mount` as well.
`credential` defines the Hashicorp Vault credentials depending on the authentication method. There's multiple methods for authentication; For kubernetes you should provide path to service account token (/var/run/secrets/kubernetes.io/serviceaccount/token) or provide the serviceAccountName that can authenticate to kubernetes in the namespace of the ScaledObject/ScaledJob resource (usually `default`). If using serviceAccountName make sure to grant KEDA Operator `create serviceaccounts/token` permissions. This is set in the helm chart via `permissions.operator.restrict.allowAllServiceAccountTokenCreation=true`. For token auth method, we recommend reading the Vault token from a Kubernetes Secret via `credential.tokenFrom.secretKeyRef`.
`secrets` list defines the mapping between the path and the key of the secret in Vault to the parameter.
`namespace` may be used to target a given Vault Enterprise namespace.

> Since version `1.5.0` Vault secrets backend **version 2** is supported. 
> The support for Vault secrets backend **version 1** was added on version `2.10`.
>
> Starting with KEDA `v2.20`, `spec.hashiCorpVault.credential.token` is deprecated and will be removed in a future major release. Use `spec.hashiCorpVault.credential.tokenFrom.secretKeyRef` instead. If both are set, `tokenFrom.secretKeyRef` takes precedence.

```yaml
hashiCorpVault:                                               # Optional.
  address: {hashicorp-vault-address}                          # Required.
  namespace: {hashicorp-vault-namespace}                      # Optional. Default is root namespace. Useful for Vault Enterprise
  authentication: token | kubernetes                          # Required.
  role: {hashicorp-vault-role}                                # Optional.
  mount: {hashicorp-vault-mount}                              # Optional.
  credential:                                                 # Optional.
    tokenFrom:                                                # Optional. Recommended for token authentication.
      secretKeyRef:
        name: {kubernetes-secret-name}                        # Required when tokenFrom is used.
        key: {kubernetes-secret-key}                          # Required when tokenFrom is used.
    token: {hashicorp-vault-token}                            # Optional. Deprecated, kept for backward compatibility.
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
Vault Secret can be used to provide authentication for a Scaler. If using the [Prometheus scaler](https://keda.sh/docs/2.20/scalers/prometheus/), mTls can be used by the `ScaledObject` to authenticate to the Prometheus server. The following example stores the Vault token in a Kubernetes Secret and then requests a certificate from Vault dynamically.
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: vault-token
  namespace: default
type: Opaque
stringData:
  token: {hashicorp-vault-token}
---
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
      tokenFrom:
        secretKeyRef:
          name: vault-token
          key: token
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

If you currently use `credential.token`, KEDA still accepts it for backward compatibility, but admission warnings will recommend switching to `credential.tokenFrom.secretKeyRef`.
