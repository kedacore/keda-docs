+++
title = "GCP Secret Manager"
+++

You can pull secrets from GCP Secret Manager into the trigger by using the `gcpSecretManager` key.

The `secrets` list defines the mapping between the secret and the authentication parameter.

GCP IAM Service Account credentials can be used for authenticating with the Secret Manager service, which can be provided using a Kubernetes secret. Alternatively, `gcp` pod identity provider is also supported for GCP Secret Manager using `podIdentity` inside `gcpSecretManager`.

```yaml
gcpSecretManager:                                     # Optional.
  secrets:                                            # Required.
    - parameter: {param-name-used-for-auth}           # Required.
      id: {secret-manager-secret-name}                # Required.
      version: {secret-manager-secret-name}           # Optional.
  podIdentity:                                        # Optional.
    provider: gcp                                     # Required.
  credentials:                                        # Optional.
    clientSecret:                                     # Required.
      valueFrom:                                      # Required.
        secretKeyRef:                                 # Required.
          name: {k8s-secret-with-gcp-iam-sa-secret}   # Required.
          key: {key-within-the-secret}                # Required.
```

### Steps to create the IAM Service Account Kubernetes secret
- Create a new GCP IAM service account. In case you would like to use an existing service account, you can skip this step.

  ```shell
  gcloud iam service-accounts create GSA_NAME \
  --project=GSA_PROJECT
  ```

  Replace the following:

  GSA_NAME: the name of the new IAM service account.\
  GSA_PROJECT: the project ID of the Google Cloud project for your IAM service account.

- Ensure that your IAM service account has [roles](https://cloud.google.com/iam/docs/understanding-roles) which provide sufficient [permissions](https://cloud.google.com/iam/docs/permissions-reference) needed to retrieve the secrets, such as the [Secret Manager Secret Accessor](https://cloud.google.com/secret-manager/docs/access-control#secretmanager.secretAccessor). You can grant additional roles using the following command:

  ```shell
  gcloud projects add-iam-policy-binding PROJECT_ID \
  --member "serviceAccount:GSA_NAME@GSA_PROJECT.iam.gserviceaccount.com" \
  --role "ROLE_NAME"
  ```

  Replace the following:

  PROJECT_ID: your Google Cloud project ID. \
  GSA_NAME: the name of your IAM service account. \
  GSA_PROJECT: the project ID of the Google Cloud project of your IAM service account. \
  ROLE_NAME: the IAM role to assign to your service account, like roles/secretmanager.secretaccessor.

- Either setup [GCP workload identity](./gcp-workload-identity) or create a JSON key credential for authenticating with the service account:

  ```shell
  gcloud iam service-accounts keys create KEY_FILE \
    --iam-account=GSA_NAME@PROJECT_ID.iam.gserviceaccount.com
  ```

  Replace the following:

  KEY_FILE: the file path to a new output file for the private key in your local machine. \
  GSA_NAME: the name of your IAM service account. \
  PROJECT_ID: your Google Cloud project ID.

- Create a Kubernetes secret for storing the SA key file in the same namespace where you will create the `TriggerAuthentication` resource:

  ```shell
  kubectl create secret generic NAME --from-file=KEY=KEY_FILE -n NAMESPACE
  ```

  Replace the following:

  NAME: name of the Kubernetes secret resource. \
  KEY: Kubernetes secret key for the SA. \
  KEY_FILE: the file path to the SA in your local machine. \
  NAMESPACE: the namespace in which the `TriggerAuthentication` resource will be created.

Now you can create the `TriggerAuthentication` resource which references the secret-name and key for the SA.
