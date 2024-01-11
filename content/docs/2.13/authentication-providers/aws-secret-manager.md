+++ title = "AWS Secret Manager Integration" +++

You can integrate AWS Secret Manager secrets into your trigger by configuring the `awsSecretManager` key in your KEDA scaling specification.

The `secrets` list within `awsSecretManager` defines the mapping between the AWS Secret Manager secret and the authentication parameter used in your application.

### Prerequisites

1. **AWS Credentials:**
   - Ensure that AWS credentials with sufficient permissions are available. This can be achieved by setting the `TF_AWS_ACCESS_KEY` and `TF_AWS_SECRET_KEY` environment variables.

2. **AWS Secret Manager Secret:**
   - Create a secret in AWS Secret Manager containing the necessary sensitive information, such as database connection strings.

### Configuration

```yaml
awsSecretManager:
  credentials:                                     # Optional.
    accessKey:                                     # Required.
      valueFrom:                                   # Required.
        secretKeyRef:                              # Required.
          name: {k8s-secret-with-aws-credentials}  # Required.
          key: AWS_ACCESS_KEY_ID                   # Required.
    accessSecretKey:                               # Required.
      valueFrom:                                   # Required.
        secretKeyRef:                              # Required.
          name: {k8s-secret-with-aws-credentials}  # Required.
          key: AWS_SECRET_ACCESS_KEY               # Required.
  region: {aws-region}                             # Optional.
  secrets:                                         # Required.
  - parameter: {param-name-used-for-auth}          # Required.
    name: {aws-secret-name}                        # Required.
    version: {aws-secret-version}                  # Optional.
```

### Configuration Details
**credentials:** AWS credentials configuration.

- **accessKey:** Configuration for the AWS access key.

- **accessSecretKey:** Configuration for the AWS secret access key.

**region:** (Optional) The AWS region where the secret resides. If not specified, the default region is used.

**secrets:** The list of mappings between AWS Secret Manager secrets and authentication parameters used in your application.

- **parameter:** The parameter name used for authentication in your application.

- **name:** The name of the AWS Secret Manager secret.

- **version:** (Optional) The version of the AWS Secret Manager secret. If not specified, the latest version is used.