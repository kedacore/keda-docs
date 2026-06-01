+++
title = "OAuth2"
+++

You can pull an OAuth2 access token into the trigger by using the `oauth2` spec in `TriggerAuthentication` or `ClusterTriggerAuthentication` with the following snippet.

```yaml
oauth2:
  type: clientCredentials # Required.
  clientId: my-client-id  # Required.
  clientSecret:           # Required.
    valueFrom:
      secretKeyRef:
        name: oauth-secret
        key: client-secret
  tokenUrl: https://oauth2-server.com/token  # Required.
  scopes: # Optional
    - write
    - read
  tokenUrlParams: # Optional
    audience: aud
```
