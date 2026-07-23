+++
title = "Azure Service Principal"
+++

The `azureServicePrincipal` authentication provider creates a Microsoft Entra service principal credential for supported Azure scalers to use when acquiring access tokens. It can be configured in a `TriggerAuthentication` or `ClusterTriggerAuthentication` and reused by multiple scaling triggers.

The Azure Pipelines scaler supports this provider starting with KEDA 2.21.

## Parameters

- `tenantId` - Microsoft Entra tenant ID. (Required)
- `clientId` - Application (client) ID of the service principal. (Required)
- `clientSecret` - Reference to a Kubernetes Secret containing the client secret. (Optional, mutually exclusive with `clientCertificate`)
- `clientCertificate` - Reference to a Kubernetes Secret containing the client certificate and private key. (Optional, mutually exclusive with `clientSecret`)
- `clientCertificatePassword` - Reference to a Kubernetes Secret containing the password for a PKCS#12 certificate. (Optional, requires `clientCertificate`)
- `cloud` - Azure cloud environment. Built-in KEDA cloud names and environments loaded through `AZURE_ENVIRONMENT_FILEPATH` are supported. (Default: `AzurePublicCloud`, Optional)
- `activeDirectoryEndpoint` - Microsoft Entra authority endpoint. (Optional, required when `cloud` is `Private`; it must not be set for any other cloud)

Exactly one of `clientSecret` or `clientCertificate` must be configured.

## Client secret authentication

Create a Kubernetes Secret containing the service principal client secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: azure-service-principal
  namespace: default
type: Opaque
data:
  clientSecret: <base64-encoded-client-secret>
```

Reference it from the authentication provider:

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: azure-service-principal
  namespace: default
spec:
  azureServicePrincipal:
    tenantId: <tenant-id>
    clientId: <client-id>
    clientSecret:
      valueFrom:
        secretKeyRef:
          name: azure-service-principal
          key: clientSecret
```

## Client certificate authentication

The certificate Secret must contain either:

- An unencrypted PEM bundle containing the certificate and private key.
- A PKCS#12/PFX certificate, with `clientCertificatePassword` configured when it is password protected.

Encrypted PEM private keys are not supported. For certificate authentication that requires a password, use PKCS#12/PFX.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: azure-service-principal-certificate
  namespace: default
type: Opaque
data:
  clientCertificate: <base64-encoded-PEM-or-PFX>
  clientCertificatePassword: <base64-encoded-password>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: azure-service-principal-certificate
  namespace: default
spec:
  azureServicePrincipal:
    tenantId: <tenant-id>
    clientId: <client-id>
    clientCertificate:
      valueFrom:
        secretKeyRef:
          name: azure-service-principal-certificate
          key: clientCertificate
    clientCertificatePassword:
      valueFrom:
        secretKeyRef:
          name: azure-service-principal-certificate
          key: clientCertificatePassword
```

For an unencrypted PEM certificate, omit both `clientCertificatePassword` and its Secret key.

## Azure cloud environments

Azure Public Cloud is used when `cloud` is omitted. Built-in environments include `AzurePublicCloud`, `AzureUSGovernmentCloud`, and `AzureChinaCloud`.

`AzureGermanCloud` remains accepted for compatibility with legacy configurations, but [Microsoft Cloud Germany closed on October 29, 2021](https://learn.microsoft.com/entra/identity-platform/msal-national-cloud#azure-germany-microsoft-cloud-deutschland) and should not be used for new deployments.

`AzureStackCloud` can be used when `AZURE_ENVIRONMENT_FILEPATH` points to an Azure environment file that defines an environment with that name.

For a private cloud, set `cloud` to `Private` and provide its Microsoft Entra authority endpoint:

```yaml
azureServicePrincipal:
  tenantId: <tenant-id>
  clientId: <client-id>
  cloud: Private
  activeDirectoryEndpoint: https://login.private.example.com/
  clientSecret:
    valueFrom:
      secretKeyRef:
        name: azure-service-principal
        key: clientSecret
```

KEDA disables Microsoft Entra instance discovery for private-cloud service principal credentials. The consuming scaler remains responsible for selecting its Azure service endpoint and token scope.
