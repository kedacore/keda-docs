+++
title = "OAuth2"
+++

You can pull OAuth2 access token into the trigger by using the oauth2 spec like so.



```yaml
  oauth2:
    type: clientCredentials # Required.
    clientId: my-client-id  # Required.
    clientSecret:           # Required
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
