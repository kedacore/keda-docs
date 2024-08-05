+++
title = "GCP Workload Identity"
+++

[**GCP Workload Identity**](https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity) allows workloads in your GKE clusters to impersonate Identity and Access Management (IAM) service accounts to access Google Cloud services.

You can tell KEDA to use GCP Workload Identity via `podIdentity.provider`.

```yaml
podIdentity:
  provider: gcp # Optional. Default: none
```
### Steps to set up Workload Identity
If you are using podIdentity provider as `gcp`, you need to set up workload identity as below and your GKE cluster must have Workload Identity enabled.

* You need to create a GCP IAM service account with proper permissions to retrive metrics for particular scalers.

  ```shell
  gcloud iam service-accounts create GSA_NAME \
  --project=GSA_PROJECT
  ```
    
  Replace the following: \
  GSA_NAME: the name of the new IAM service account.\
  GSA_PROJECT: the project ID of the Google Cloud project for your IAM service account.


* Ensure that your IAM service account has the [roles](https://cloud.google.com/iam/docs/understanding-roles) you need. You can grant additional roles using the following command:

  ```shell
  gcloud projects add-iam-policy-binding PROJECT_ID \
  --member "serviceAccount:GSA_NAME@GSA_PROJECT.iam.gserviceaccount.com" \
  --role "ROLE_NAME"
  ```

  Replace the following:

  PROJECT_ID: your Google Cloud project ID. \
  GSA_NAME: the name of your IAM service account. \
  GSA_PROJECT: the project ID of the Google Cloud project of your IAM service account. \
  ROLE_NAME: the IAM role to assign to your service account, like roles/monitoring.viewer.

* Allow the Kubernetes service account to impersonate the IAM service account by adding an IAM policy binding between the two service accounts. This binding allows the Kubernetes service account to act as the IAM service account.
  ```shell
  gcloud iam service-accounts add-iam-policy-binding GSA_NAME@GSA_PROJECT.iam.gserviceaccount.com \
      --role roles/iam.workloadIdentityUser \
      --member "serviceAccount:PROJECT_ID.svc.id.goog[NAMESPACE/KSA_NAME]"
  ```
  Replace the following:

  PROJECT_ID: your Google Cloud project ID. \
  GSA_NAME: the name of your IAM service account. \
  GSA_PROJECT: the project ID of the Google Cloud project of your IAM service account. \
  NAMESPACE: Namespace where keda operator is installed; defaults to `keda` . \
  KSA_NAME: Kubernetes service account name of the keda; defaults to `keda-operator` .
* Then you need to annotate the Kubernetes service account with the email address of the IAM service account.

  ```shell
  kubectl annotate serviceaccount keda-operator \
    --namespace keda \
    iam.gke.io/gcp-service-account=GSA_NAME@GSA_PROJECT.iam.gserviceaccount.com
  ```
  Replace the following: \

  GSA_NAME: the name of your IAM service account. \
  GSA_PROJECT: the project ID of the Google Cloud project of your IAM service account. 


  Refer to GCP official [documentation](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity#authenticating_to) for more.
