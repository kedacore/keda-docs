+++
title = "GCP Workload Identity"
+++

[**GCP Workload Identity**](https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity) allows workloads in your GKE clusters to impersonate Identity and Access Management (IAM) service accounts to access Google Cloud services.

You can tell KEDA to use GCP Workload Identity via `podIdentity.provider`.

```yaml
podIdentity:
  provider: gcp # Optional. Default: none
```

To federate a specific Kubernetes service account through an IAM workload identity pool, see [Select a workload service account](#select-a-workload-service-account).

### Steps to set up Workload Identity for the operator

When `serviceAccountName` is omitted, KEDA uses the operator's Google credentials. For GKE Workload Identity, enable Workload Identity on your GKE cluster and configure the operator as follows.

* You need to create a GCP IAM service account with proper permissions to retrieve metrics for particular scalers.

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


## Select a workload service account

Set `serviceAccountName` to authenticate through an explicit IAM workload identity pool and OIDC provider. Complete the [administrator approval](../../concepts/workload-service-accounts/#administrator-setup) for the account in the ScaledObject or ScaledJob namespace.

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: google-scaling
  namespace: payments
spec:
  podIdentity:
    provider: gcp
    serviceAccountName: scaling-gcp
    # Optional IAM service-account impersonation:
    identityId: scaling-reader@application-project.iam.gserviceaccount.com
```

**Parameter list:**

- `serviceAccountName` - Kubernetes service account in the consuming ScaledObject or ScaledJob namespace. Requires administrator approval for that exact namespace/account. (Optional)
- `identityId` - Google IAM service-account email to impersonate. When omitted, KEDA uses the federated identity directly. (Optional, Only supported for GCP when `serviceAccountName` is set)

Follow [Google's Kubernetes federation guide](https://cloud.google.com/iam/docs/workload-identity-federation-with-kubernetes) to configure the pool/provider for your cluster's OIDC issuer. Map `google.subject` to `assertion.sub` and grant access to the exact subject `system:serviceaccount:payments:scaling-gcp`. Grant resource permissions directly to that federated principal, or grant it `roles/iam.workloadIdentityUser` on the IAM service account specified by `identityId` and give that IAM account the resource permissions.

The administrator-approved audience must be `https://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL/providers/PROVIDER`, or the equivalent form beginning with `//iam.googleapis.com/`. Custom audience strings are unsupported. KEDA preserves the configured audience in the Kubernetes token and normalizes the provider resource name for Google STS.

Supply resource projects explicitly where the scaler requires them. For [Pub/Sub](../../scalers/gcp-pub-sub/), use `projects/PROJECT/subscriptions/NAME` in `subscriptionName`, or `projects/PROJECT/topics/NAME` in `topicName`, including when resolving these values from environment variables.

This mode does not discover a GKE-managed provider or read the `iam.gke.io/gcp-service-account` annotation. The operator-based GKE configuration above remains available when `serviceAccountName` is omitted. See [delegation and credential handling](../../concepts/workload-service-accounts/#delegation-and-credential-handling) for the security boundary and supported combinations.
