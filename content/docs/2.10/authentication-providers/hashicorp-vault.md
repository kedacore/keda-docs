+++
title = "Hashicorp Vault secret"
+++


You can pull one or more Hashicorp Vault secrets into the trigger by defining the authentication metadata such as Vault `address` and the `authentication` method (token | kubernetes). If you choose kubernetes auth method you should provide `role` and `mount` as well.
`credential` defines the Hashicorp Vault credentials depending on the authentication method, for kubernetes you should provide path to service account token (/var/run/secrets/kubernetes.io/serviceaccount/token) and for token auth method provide the token.
`secrets` list defines the mapping between the path and the key of the secret in Vault to the parameter.
`namespace` may be used to target a given Vault Enterprise namespace.

> Since version `1.5.0` Vault secrets backend **version 2** is supported. 
> The support for Vault secrets backend **version 1** was added on version `2.10`.

```yaml
hashiCorpVault:                                     # Optional.
  address: {hashicorp-vault-address}                # Required.
  namespace: {hashicorp-vault-namespace}            # Optional. Default is root namespace. Useful for Vault Enterprise
  authentication: token | kubernetes                # Required.
  role: {hashicorp-vault-role}                      # Optional.
  mount: {hashicorp-vault-mount}                    # Optional.
  credential:                                       # Optional.
    token: {hashicorp-vault-token}                  # Optional.
    serviceAccount: {path-to-service-account-file}  # Optional.
  secrets:                                          # Required.
  - parameter: {scaledObject-parameter-name}        # Required.
    key: {hashicorp-vault-secret-key-name}           # Required.
    path: {hashicorp-vault-secret-path}              # Required.
```
