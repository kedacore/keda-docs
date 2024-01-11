+++ title = "AWS Secret Manager Integration with Pod Identity" +++

Configure AWS Secret Manager integration with pod identity in your KEDA trigger by using the `awsSecretManager` key within the `TriggerAuthentication` resource.

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: {trigger-authentication-name}        # Required.
  namespace: {k8s-namespace}                 # Required.
spec:
  awsSecretManager:
    podIdentity:                             # Optional.
      provider: aws                          # Required.
    secrets:                                 # Required.
    - parameter: {param-name-used-for-auth}  # Required.
      name: {aws-secret-name}                # Required.
      version: {aws-secret-version}          # Optional.
```

### Configuration Details

**podIdentity:** Configuration for using AWS pod identity.

- **provider:** Provider for pod identity, in this case, set to aws.
**secrets:** The list of mappings between AWS Secret Manager secrets and authentication parameters used in your application.

- **parameter:** The parameter name used for authentication in your application.

- **name:** The name of the AWS Secret Manager secret.

- **version:** (Optional) The version of the AWS Secret Manager secret. If not specified, the latest version is used.