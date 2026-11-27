+++
title = "GCP Workload Identity"
+++

[**GCP Workload Identity**](https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity) allows workloads in your GKE clusters to impersonate Identity and Access Management (IAM) service accounts to access Google Cloud services.

You can tell KEDA to use GCP Workload Identity via `podIdentity.provider`.

```yaml
podIdentity:
  provider: gcp # Optional. Default: none
```

To federate a specific Kubernetes service account through a Google IAM Workload Identity Pool or GKE Workload Identity Pool, see [Select a workload service account](#select-a-workload-service-account).

### Steps to set up Workload Identity for the operator

With `provider: gcp`, KEDA uses the operator's Google credentials. This provider does not accept `serviceAccountName`. For GKE Workload Identity, enable Workload Identity on your GKE cluster and configure the operator as follows.

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

Set `provider: gcp-workload-service-account` and `serviceAccountName` to authenticate a supported scaler using an administrator-approved Kubernetes service account through either an external Google IAM Workload Identity Pool provider or a GKE Workload Identity Pool. Complete the [administrator setup](../../concepts/workload-service-accounts/#administrator-setup) for the exact service account in the consuming `ScaledObject` or `ScaledJob` namespace.

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: google-scaling
  namespace: payments
spec:
  podIdentity:
    provider: gcp-workload-service-account
    serviceAccountName: scaling-gcp
    # Optional IAM service-account impersonation:
    identityId: scaling-reader@application-project.iam.gserviceaccount.com
```

**Parameter list:**

- `serviceAccountName` - Required Kubernetes service account in the consuming `ScaledObject` or `ScaledJob` namespace. Requires administrator approval in `permissions.operator.restrict.cloudWorkloadIdentityTokenCreationRoles` (or `KEDA_CLOUD_WORKLOAD_IDENTITY_AUDIENCES`) for that exact namespace/account.
- `identityId` - Google IAM service-account email to impersonate. Supports user-managed (`NAME@PROJECT.iam.gserviceaccount.com`), Compute Engine default (`PROJECT_NUMBER-compute@developer.gserviceaccount.com`), and App Engine default (`PROJECT_ID@appspot.gserviceaccount.com`) service accounts. When omitted, KEDA uses the federated identity directly. (Optional, only supported for GCP with `provider: gcp-workload-service-account`)

Two administrator-approved Google audience formats are accepted:

- **External Google IAM Workload Identity Pool provider:** `https://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL/providers/PROVIDER` (or the equivalent form beginning with `//iam.googleapis.com/`). Follow [Google's Kubernetes federation guide](https://cloud.google.com/iam/docs/workload-identity-federation-with-kubernetes) to configure the pool and OIDC provider for your cluster, map `google.subject` to `assertion.sub`, and grant access to `system:serviceaccount:payments:scaling-gcp` (directly on GCP resources, or via `roles/iam.workloadIdentityUser` on the IAM service account in `identityId`). KEDA preserves the configured audience on the Kubernetes token and normalizes the provider resource name for Google STS.
- **GKE Workload Identity Pool:** `identitynamespace:PROJECT_ID.svc.id.goog:https://container.googleapis.com/v1/projects/CLUSTER_PROJECT_ID/locations/LOCATION/clusters/CLUSTER`. KEDA requests the Kubernetes token with audience `PROJECT_ID.svc.id.goog` (matching the GKE metadata server) and sends the full `identitynamespace:...` audience to Google STS. Grant resource permissions directly to `principal://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/PROJECT_ID.svc.id.goog/subject/ns/NAMESPACE/sa/SERVICE_ACCOUNT`, or grant `serviceAccount:PROJECT_ID.svc.id.goog[NAMESPACE/SERVICE_ACCOUNT]` the `roles/iam.workloadIdentityUser` role on the IAM service account specified by `identityId`.

Custom audience strings are unsupported. This provider does not read the `iam.gke.io/gcp-service-account` Kubernetes annotation; set `identityId` explicitly when IAM service-account impersonation is needed. The operator-based GKE configuration above remains available with `provider: gcp` and without `serviceAccountName`.

Supported scalers are `gcp-pubsub`, `gcp-spanner`, `gcp-stackdriver`, `gcp-storage`, and `prometheus` (Google Managed Service for Prometheus at `https://monitoring.googleapis.com`). Supply resource projects explicitly where required: for [Pub/Sub](../../scalers/gcp-pub-sub/), use `projects/PROJECT/subscriptions/NAME` in `subscriptionName` or `projects/PROJECT/topics/NAME` in `topicName`, including when resolved from environment variables.

Cloud workload identity approvals are isolated from `KEDA_SERVICE_ACCOUNT_TOKEN_AUDIENCES` (Vault and generic `boundServiceAccountToken`). However, `identityId` is user-selected configuration and does not limit which IAM service accounts the federated principal may impersonate. Restrict both direct resource grants and impersonation grants on the approved principal. See [delegation and credential handling](../../concepts/workload-service-accounts/#delegation-and-credential-handling) for the full security model and supported combinations.
