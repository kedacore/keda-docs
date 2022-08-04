+++
title = "Azure Pod Identity"
layout = "provider"
weight = 1
+++

Azure Pod Identity is an implementation of [**Azure AD Pod Identity**](https://github.com/Azure/aad-pod-identity) which lets you bind an [**Azure Managed Identity**](https://docs.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/) to a Pod in a Kubernetes cluster as delegated access - *Don't manage secrets, let Azure AD do the hard work*.

You can tell KEDA to use Azure AD Pod Identity via `podIdentity.provider`.

```yaml
podIdentity:
  provider: azure           # Optional. Default: none
  identityId: <identity-id> # Optional. Default: Identity linked with the label set when installing KEDA.
```

Azure AD Pod Identity will give access to containers with a defined label for `aadpodidbinding`.  You can set this label on the KEDA operator deployment.  This can be done for you during deployment with Helm with `--set podIdentity.activeDirectory.identity={your-label-name}`.

You can override the identity that was assigned to KEDA during installation, by specifying an `identityId` parameter under the `podIdentity` field. This allows end-users to use different identities to access various resources which is more secure than using a single identity that has access to multiple resources.
