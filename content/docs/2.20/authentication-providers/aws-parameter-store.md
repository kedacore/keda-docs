+++ 
title = "AWS Systems Manager Parameter Store" 
+++

You can integrate AWS Systems Manager Parameter Store parameters into your trigger by configuring the `awsParameterStore` key in your KEDA scaling specification.

The `podIdentity` section configures the usage of AWS pod identity with the provider set to AWS.

The `credentials` section specifies AWS credentials, including the `accessKey` and `secretAccessKey`.

- **accessKey:** Configuration for the AWS access key.
- **secretAccessKey:** Configuration for the AWS secret access key.

The `region` parameter is optional and represents the AWS region where the parameter resides, defaulting to the default region if not specified.

The `parameters` list within `awsParameterStore` defines the mapping between the AWS Parameter Store parameter and the authentication parameter used in your application, including the parameter name, AWS Parameter Store parameter name, and an optional `withDecryption` flag to decrypt SecureString parameters.

### Configuration

```yaml
awsParameterStore:
  podIdentity:                                     # Optional.
    provider: aws                                  # Required.
  credentials:                                     # Optional.
    accessKey:                                     # Required.
      valueFrom:                                   # Required.
        secretKeyRef:                              # Required.
          name: {k8s-secret-with-aws-credentials}  # Required.
          key: {key-in-k8s-secret}                 # Required.
    accessSecretKey:                               # Required.
      valueFrom:                                   # Required.
        secretKeyRef:                              # Required.
          name: {k8s-secret-with-aws-credentials}  # Required.
          key: {key-in-k8s-secret}                 # Required.
  region: {aws-region}                             # Optional.
  parameters:                                      # Required.
  - parameter: {param-name-used-for-auth}          # Required.
    name: {aws-parameter-name}                     # Required.
    withDecryption: true                           # Optional. Default: true
```
