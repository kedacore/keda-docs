+++ 
title = "AWS Secret Manager" 
+++

You can integrate AWS Secret Manager secrets into your trigger by configuring the `awsSecretManager` key in your KEDA scaling specification.

The `credentials` section specifies AWS credentials, including the `accessKey` and `secretAccessKey`.

- **accessKey:** Configuration for the AWS access key.
- **secretAccessKey:** Configuration for the AWS secret access key.

The `region` parameter is optional and represents the AWS region where the secret resides, defaulting to the default region if not specified.

The `secrets` list within `awsSecretManager` defines the mapping between the AWS Secret Manager secret and the authentication parameter used in your application, including the parameter name, AWS Secret Manager secret name, and an optional version parameter, defaulting to the latest version if unspecified.

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
