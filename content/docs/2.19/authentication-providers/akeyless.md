+++
title = "Akeyless secret"
+++

You can pull secrets from Akeyless into the trigger by using the `akeyless` key.

The `secrets` list defines the mapping between the Akeyless secret path and the authentication parameter.

- **Access Key authentication**: Requires `accessKey` to be provided
- **AWS IAM authentication**: Uses AWS IAM credentials from the pod's environment
- **Kubernetes authentication**: Requires `k8sAuthConfigName` to be provided.
- **GCP authentication**: Uses GCP workload identity from the pod's environment
- **Azure AD authentication**: Uses Azure AD credentials from the pod's environment

The `gatewayUrl` parameter specifies the Akeyless Gateway URL e.g. `http://unified.akeyless.svc.cluster.local:8000/api/v2`. If not provided, it defaults to `https://api.akeyless.io`.

Akeyless supports three types of secrets:
- **Static secrets**: Password and Generic text/JSON/key-value secrets stored in Akeyless.
- **Dynamic secrets**: Secrets that are dynamically generated (e.g., database credentials).
- **Rotated secrets**: Secrets that are automatically rotated.

For JSON-formatted secrets, you can optionally specify a `key` to extract a specific value from the JSON object. If no `key` is provided, the entire JSON string will be returned.

```yaml
akeyless:                                                      # Optional.
  gatewayUrl: {akeyless-gateway-url}                           # Optional. Defaults to https://api.akeyless.io
  accessId: {akeyless-access-id}                               # Required. Format: p-([A-Za-z0-9]{14}|[A-Za-z0-9]{12})
  accessKey:                                                   # Optional. Required for access_key authentication type
    valueFrom:                                                 # Required.
      secretKeyRef:                                            # Required.
        name: {k8s-secret-with-akeyless-credentials}          # Required.
        key: {key-in-k8s-secret}                               # Required.
  k8sAuthConfigName: {akeyless-k8s-auth-config-name}           # Optional. Required for k8s authentication type
  k8sServiceAccountToken:                                      # Optional. For k8s authentication. If not provided, will be read from /var/run/secrets/kubernetes.io/serviceaccount/token
    valueFrom:                                                 # Required.
      secretKeyRef:                                            # Required.
        name: {k8s-secret-with-service-account-token}          # Required.
        key: {key-in-k8s-secret}                               # Required.
  k8sGatewayUrl: {akeyless-k8s-gateway-url}                    # Optional. For k8s authentication. If not provided, uses gatewayUrl
  podIdentity:                                                 # Optional. For Azure AD authentication.
    provider: azure-workload
    identityId: {azure-managed-identity-client-id} 
  secrets:                                                     # Required.
  - parameter: {param-name-used-for-auth}                      # Required.
    path: {akeyless-secret-path}                               # Required.
    key: {akeyless-secret-key}                                 # Optional. Used to extract a specific key from JSON-formatted secrets
```

## Authentication Methods

### Access Key Authentication

When using Access Key authentication, you must provide `accessKey` via a Kubernetes secret reference:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: akeyless-credentials
type: Opaque
data:
  access-key: <base64-encoded-access-key>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: akeyless-trigger-auth
spec:
  akeyless:
    gatewayUrl: https://api.akeyless.io
    accessId: p-xxxxxxxxxxxxam
    accessKey:
      valueFrom:
        secretKeyRef:
          name: akeyless-credentials
          key: access-key
    secrets:
    - parameter: apiKey
      path: /path/to/secret
```

### AWS IAM Authentication

```yaml
akeyless:
  gatewayUrl: https://api.akeyless.io
  accessId: p-xxxxxxxxxxxxwm
  secrets:
  - parameter: apiKey
    path: /path/to/secret
```

### Kubernetes Authentication

When using Kubernetes authentication, you must provide `k8sAuthConfigName`. The `k8sServiceAccountToken` can be provided via a Kubernetes secret reference, or it will be automatically read from `/var/run/secrets/kubernetes.io/serviceaccount/token`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: akeyless-k8s-token
type: Opaque
data:
  token: <base64-encoded-service-account-token>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: akeyless-trigger-auth
spec:
  akeyless:
    gatewayUrl: https://api.akeyless.io
    accessId: p-xxxxxxxxxxxxkm
    k8sAuthConfigName: my-k8s-auth-config
    k8sServiceAccountToken:  # Optional. If not provided, will be read from /var/run/secrets/kubernetes.io/serviceaccount/token
      valueFrom:
        secretKeyRef:
          name: akeyless-k8s-token
          key: token
    k8sGatewayUrl: https://custom-gateway.akeyless.io  # Optional. If not provided, uses gatewayUrl
    secrets:
    - parameter: apiKey
      path: /path/to/secret
```

### GCP Authentication

```yaml
akeyless:
  gatewayUrl: https://api.akeyless.io
  accessId: p-xxxxxxxxxxxxgm
  secrets:
  - parameter: apiKey
    path: /path/to/secret
```

### Azure AD Authentication

The authentication will use Azure AD credentials from the pod's environment.

By default, Azure AD authentication uses the identity assigned to the KEDA operator pod. You can override this by specifying `podIdentity.identityId` in the TriggerAuthentication spec to use a different Azure managed identity:


```yaml
akeyless:
  gatewayUrl: https://api.akeyless.io
  accessId: p-xxxxxxxxxxxxzm
  # Optional. Overrides the default identity
  podIdentity:
    provider: azure-workload
    identityId: <azure-managed-identity-client-id>
  secrets:
  - parameter: apiKey
    path: /path/to/secret
```

## Secret Types

### Static Secrets

Static secrets are standard key-value secrets. They can be plain strings or JSON objects:

```yaml
secrets:
- parameter: apiKey
  path: /my-secrets/api-key
  # If the secret is a JSON object like {"apiKey": "value", "apiSecret": "secret"}
  # and you want to extract just the apiKey, use:
  key: apiKey
```

### Dynamic Secrets

Dynamic secrets are automatically generated by Akeyless (e.g., database credentials). They are returned as JSON objects:

```yaml
secrets:
- parameter: dbPassword
  path: /dynamic-secrets/database-creds
  # If the dynamic secret returns {"username": "user", "password": "pass"}
  # and you want just the password, use:
  key: password
```

### Rotated Secrets

Rotated secrets are automatically rotated by Akeyless. They are returned as JSON objects:

```yaml
secrets:
- parameter: dbPassword
  path: /rotated-secrets/database-creds
  # If the rotated secret returns {"username": "user", "password": "pass"}
  # and you want just the password, use:
  key: password
```

## Example

Akeyless secrets can be used to provide authentication for a Scaler. If using the [Prometheus scaler](https://keda.sh/docs/2.19/scalers/prometheus/), you can use Akeyless to retrieve the API key:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: akeyless-credentials
  namespace: default
type: Opaque
data:
  access-key: <base64-encoded-access-key>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: akeyless-trigger-auth
  namespace: default
spec:
  akeyless:
    gatewayUrl: https://api.akeyless.io
    accessId: p-xxxxxxxxxxxxxa
    accessKey:
      valueFrom:
        secretKeyRef:
          name: akeyless-credentials
          key: access-key
    secrets:
    - parameter: apiKey
      path: /my-secrets/prometheus-api-key
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: prometheus-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: my-deployment
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus-server:9090
      metricName: http_requests_total
      threshold: '100'
    authenticationRef:
      name: akeyless-trigger-auth
```

## Notes

- The `gatewayUrl` will automatically have `/api/v2` appended if the path is empty
- The `accessKey` must be provided via a Kubernetes secret reference using `valueFrom.secretKeyRef`
- For Kubernetes authentication, if `k8sServiceAccountToken` is not provided, KEDA will attempt to read it from `/var/run/secrets/kubernetes.io/serviceaccount/token`
- If `k8sServiceAccountToken` is provided via `valueFrom.secretKeyRef`, the token value will be automatically base64 encoded if it's not already encoded
- For JSON-formatted secrets, if no `key` is specified, the entire JSON string will be returned
- The authentication method is automatically determined from the Access ID format - you don't need to specify it explicitly

