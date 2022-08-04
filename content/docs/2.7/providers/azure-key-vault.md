+++
title = "Azure Key Vault secret(s)"
+++


You can pull secrets from Azure Key Vault into the trigger by using the `azureKeyVault` key.

The `secrets` list defines the mapping between the key vault secret and the authentication parameter.

Currently pod identity providers are not supported for key vault.

You need to register an [application](https://docs.microsoft.com/en-us/azure/active-directory/develop/app-objects-and-service-principals) with Azure Active Directory and specify its credentials. The `clientId` and `tenantId` for the application are to be provided as part of the spec. The `clientSecret` for the application is expected to be within a kubernetes secret in the same namespace as the authentication resource.

Ensure that "read secret" permissions have been granted to the Azure AD application on the Azure Key Vault. Learn more in the Azure Key Vault [documentation](https://docs.microsoft.com/en-us/azure/key-vault/general/assign-access-policy?tabs=azure-portal).

The `cloud` parameter can be used to specify cloud environments besides `Azure Public Cloud`, such as known Azure clouds like
`Azure China Cloud`, etc. and even Azure Stack Hub or Air Gapped clouds.

```yaml
azureKeyVault:                                          # Optional.
  vaultURI: {key-vault-address}                         # Required.
  credentials:                                          # Required.
    clientId: {azure-ad-client-id}                      # Required.
    clientSecret:                                       # Required.
      valueFrom:                                        # Required.
        secretKeyRef:                                   # Required.
          name: {k8s-secret-with-azure-ad-secret}       # Required.
          key: {key-within-the-secret}                  # Required.
    tenantId: {azure-ad-tenant-id}                      # Required.
  cloud:                                                # Optional.
    type: AzurePublicCloud | AzureUSGovernmentCloud | AzureChinaCloud | AzureGermanCloud | Private # Required.
    keyVaultResourceURL: {key-vault-resource-url-for-cloud}           # Required when type = Private.
    activeDirectoryEndpoint: {active-directory-endpoint-for-cloud}    # Required when type = Private.
  secrets:                                              # Required.
  - parameter: {param-name-used-for-auth}               # Required.
    name: {key-vault-secret-name}                       # Required.
    version: {key-vault-secret-version}                 # Optional.
```
