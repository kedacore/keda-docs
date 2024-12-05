+++ 
title = "AWS Secret Manager" 
+++

You can integrate AWS Secret Manager secrets into your trigger by configuring the `awsSecretManager` key in your KEDA scaling specification.

The `podIdentity` section configures the usage of AWS pod identity with the provider set to AWS.

The `credentials` section specifies AWS credentials, including the `accessKey` and `secretAccessKey`.

- **accessKey:** Configuration for the AWS access key.
- **secretAccessKey:** Configuration for the AWS secret access key.

The `region` parameter is optional and represents the AWS region where the secret resides, defaulting to the default region if not specified.

The `secrets` list within `awsSecretManager` defines the mapping between the AWS Secret Manager secret and the authentication parameter used in your application, including the parameter name, AWS Secret Manager secret name, and an optional version parameter, defaulting to the latest version if unspecified.

### Configuration

```yaml
awsSecretManager:
  podIdentity:                                     # Optional.
    provider: aws                                  # Required.
  credentials:                                     # Optional.
    accessKey:                                     # Required.
      valueFrom:                                   # Required.
        secretKeyRef:                              # Required.
          name: {k8s-secret-with-aws-credentials}  # Required.
          key: {key-in-k8s-secret}                    # Required.
    accessSecretKey:                               # Required.
      valueFrom:                                   # Required.
        secretKeyRef:                              # Required.
          name: {k8s-secret-with-aws-credentials}  # Required.
          key: {key-in-k8s-secret}               # Required.
  region: {aws-region}                             # Optional.
  secrets:                                         # Required.
  - parameter: {param-name-used-for-auth}          # Required.
    name: {aws-secret-name}                        # Required.
    version: {aws-secret-version}                  # Optional.
```
