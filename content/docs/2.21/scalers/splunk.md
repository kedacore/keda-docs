+++
title = "Splunk"
availability = "v2.15+"
maintainer = "Community"
category = "Data & Storage"
description = "Scale applications based on Splunk saved search results."
go_file = "splunk_scaler"
+++

### Trigger Specification

This specification describes the `splunk` trigger that scales based on the result of a [saved search](https://docs.splunk.com/Documentation/Splunk/9.2.1/Search/Savingsearches).

The trigger always requires the following information:

```yaml
triggers:
  - type: splunk
    metadata:
      host: https://splunk.default.svc.cluster.local:8089
      targetValue: "1"
      activationValue: "10"
      savedSearchName: my-saved-search-name
      valueField: count
```

**Parameter list:**

- `host` - Search API host and port. Example: `https://localhost:8089`.
- `unsafeSsl` - Whether to trust invalid certificates or not. (Values: `"true"`, `"false"`, Default: `"false"`, Optional)
- `targetValue` - Value to reach to start scaling (This value can be a integer or float).
- `activationValue` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).
- `savedSearchName` - Name of saved search that returns metric data for scaling.
- `valueField` - The name of the field in the search results containing the metric value. Example: `index=_internal | tail | stats count`, the `valueField` is `count`.

### Authentication Parameters

You can authenticate by using a username/password or an API token. You will need to use `TriggerAuthentication` CRD to configure the authentication.

> **Note:**
>
> `TriggerAuthentication` is required to use this scaler due to the hard requirement of providing a `username` for the Splunk API.

**Parameter list:**

- `username` - Splunk username authorized to access the search API.
- `apiToken` - Splunk API token for supplied `username`. Conflicts with `password`.
- `password` - Password for supplied `username`. Conflicts with `apiToken`.

The user will need access to the saved search.

### Examples

### Username/password

```yaml
---
apiVersion: v1
kind: Secret
metadata:
  name: splunk-creds
data:
  username: YWRtaW4= # "admin"
  password: cGFzc3dvcmQ= # "password"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: splunk-auth
spec:
  secretTargetRef:
    - parameter: username
      name: splunk-creds
      key: username
    - parameter: password
      name: splunk-creds
      key: password
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: splunk-scaledobject
spec:
  pollingInterval: 15
  minReplicaCount: 1
  maxReplicaCount: 3
  scaleTargetRef:
    name: nginx
  triggers:
  - type: splunk
    authenticationRef:
      name: splunk-auth
    metadata:
      host: https://splunk.default.svc.cluster.local:8089
      targetValue: "11"
      activationValue: "15"
      savedSearchName: my-saved-search-name
      valueField: count
```

### API Token

```yaml
---
apiVersion: v1
kind: Secret
metadata:
  name: splunk-creds
data:
  username: YWRtaW4= # admin
  apiToken: <base64 encoded api token>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: splunk-auth
spec:
  secretTargetRef:
    - parameter: username
      name: splunk-creds
      key: username
    - parameter: apiToken
      name: splunk-creds
      key: apiToken
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: splunk-scaledobject
spec:
  pollingInterval: 15
  minReplicaCount: 1
  maxReplicaCount: 3
  scaleTargetRef:
    name: nginx
  triggers:
  - type: splunk
    authenticationRef:
      name: splunk-auth
    metadata:
      host: https://splunk.default.svc.cluster.local:8089
      targetValue: "11"
      activationValue: "15"
      savedSearchName: my-saved-search-name
      valueField: count
```

### Full example using Splunk deployment

```yaml
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: splunkconf
data:
  default.yml: |
    splunk:
      conf:
        - key: savedsearches
          value:
            directory: /opt/splunk/etc/users/admin/search/local
            content:
              my-saved-search-name:
                action.email.useNSSubject: 1
                action.webhook.enable_allowlist: 0
                alert.track: 0
                cron_schedule: '*/1 * * * *'
                dispatch.earliest_time: -15m
                dispatch.latest_time: now
                display.general.type: statistics
                display.page.search.tab: statistics
                display.visualizations.show: 0
                enableSched: 1
                request.ui_dispatch_app: search
                request.ui_dispatch_view: search
                search: index=_internal | tail | stats count
---
apiVersion: v1
kind: Secret
metadata:
  name: splunk-creds
data:
  username: YWRtaW4= # "admin"
  password: cGFzc3dvcmQ= # "password"
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: splunk-auth
spec:
  secretTargetRef:
    - parameter: username
      name: splunk-creds
      key: username
    - parameter: password
      name: splunk-creds
      key: password
---
apiVersion: v1
kind: Service
metadata:
  name: splunk
spec:
  ports:
    - port: 8000
      targetPort: web
      name: web-svc
    - port: 8089
      targetPort: 8089
      name: api-svc
  selector:
    app: splunk
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: splunk
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: splunk
  template:
    metadata:
      labels:
        app: splunk
    spec:
      containers:
      - name: splunk
        image: splunk/splunk:9.2
        ports:
          - containerPort: 8000
            name: web
          - containerPort: 8089
            name: api
        env:
          - name: SPLUNK_START_ARGS
            value: --accept-license
          - name: SPLUNK_PASSWORD
            value: password
        volumeMounts:
          - name: splunkconf-volume
            mountPath: /tmp/defaults
      volumes:
        - name: splunkconf-volume
          configMap:
            name: splunkconf
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  selector:
    matchLabels:
      app: nginx
  replicas: 1
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx
        ports:
        - containerPort: 8080
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: splunk-scaledobject
spec:
  pollingInterval: 15
  minReplicaCount: 1
  maxReplicaCount: 3
  scaleTargetRef:
    name: nginx
  triggers:
  - type: splunk
    authenticationRef:
      name: splunk-auth
    metadata:
      host: https://splunk.default.svc.cluster.local:8089
      unsafeSsl: "true"
      targetValue: "5"
      activationValue: "5"
      savedSearchName: my-saved-search-name
      valueField: count
```
