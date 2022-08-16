+++
title = "GCP Workload Identity"
+++

[**GCP Workload Identity**](https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity) allows workloads in your GKE clusters to impersonate Identity and Access Management (IAM) service accounts to access Google Cloud services.

You can tell KEDA to use GCP Workload Identity via `podIdentity.provider`.

```yaml
podIdentity:
  provider: gcp # Optional. Default: none
```
