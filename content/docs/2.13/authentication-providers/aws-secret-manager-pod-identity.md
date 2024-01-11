+++ title = "AWS Secret Manager Pod Identity" +++

Configure AWS Secret Manager integration with pod identity in your KEDA trigger by using the `awsSecretManager` key within the `TriggerAuthentication` resource.

The `podIdentity` section configures the usage of AWS pod identity with the provider set to AWS.

The `secrets` list within `awsSecretManager` defines the mapping between the AWS Secret Manager secret and the authentication parameter used in your application, including the parameter name, AWS Secret Manager secret name, and an optional version parameter, defaulting to the latest version if unspecified.

```yaml
awsSecretManager:
  podIdentity:                             # Optional.
    provider: aws                          # Required.
  secrets:                                 # Required.
  - parameter: {param-name-used-for-auth}  # Required.
    name: {aws-secret-name}                # Required.
    version: {aws-secret-version}          # Optional.
```
