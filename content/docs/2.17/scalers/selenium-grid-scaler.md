+++
title = "Selenium Grid Scaler"
availability = "v2.4+"
maintainer = "Volvo Cars, SeleniumHQ"
category = "Testing"
description = "Scales Selenium browser nodes based on number of requests waiting in session queue"
go_file = "selenium_grid_scaler"
+++

### Trigger Specification

This specification describes the `selenium-grid` trigger that scales browser nodes based on number of requests in session queue and the max sessions per grid.

The scaler creates one browser node per pending request in session queue, divided by the max amount of sessions that can run in parallel. You will have to create one trigger per browser capability that you would like to support in your Selenium Grid.

The below is an example trigger configuration with default values represent.

```yaml
triggers:
  - type: selenium-grid
    metadata:
      url: 'http://selenium-hub:4444/graphql' # Required. Can be ommitted if specified via TriggerAuthentication/ClusterTriggerAuthentication.
      browserName: ''  # Optional. Required to be matched with the request in queue and Node stereotypes (Similarly for `browserVersion` and `platformName`).
      browserVersion: '' # Optional.
      platformName: 'linux' # Optional.
      unsafeSsl : 'false' # Optional.
      activationThreshold: 0 # Optional.
```

**Parameter list:**

- `url` - Graphql url of your Selenium Grid. Refer to the Selenium Grid's documentation [here](https://www.selenium.dev/documentation/en/grid/grid_4/graphql_support/) to for more info. If endpoint requires authentication, you can use `TriggerAuthentication` to provide the credentials instead of embedding in the URL.
- `browserName` - Name of browser that usually gets passed in the browser capability. Refer to the [Selenium Grid's](https://www.selenium.dev/documentation/en/getting_started_with_webdriver/browsers/) and [WebdriverIO's](https://webdriver.io/docs/options/#capabilities) documentation for more info. (Optional)
- `sessionBrowserName` -  Name of the browser when it is an active session, only set if `BrowserName` changes between the queue and the active session. See the Edge example below for further detail. (Optional)
- `browserVersion` - Version of browser that usually gets passed in the browser capability. Refer to the [Selenium Grid's](https://www.selenium.dev/documentation/en/getting_started_with_webdriver/browsers/) and [WebdriverIO's](https://webdriver.io/docs/options/#capabilities) documentation for more info. (Optional)
- `unsafeSsl` - Skip certificate validation when connecting over HTTPS. (Values: `true`, `false`, Default: `false`, Optional)
- `activationThreshold` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds). (Default: `0`, Optional)
- `platformName` - Name of the browser platform. Refer to the [Selenium Grid's](https://www.selenium.dev/documentation/en/getting_started_with_webdriver/browsers/) and [WebdriverIO's](https://webdriver.io/docs/options/#capabilities) documentation for more info. (Default: `Linux`, Optional)
- `nodeMaxSessions` - Number of maximum sessions that can run in parallel on a Node. Update this parameter align with node config `--max-sessions` (`SE_NODE_MAX_SESSIONS`) to have the correct scaling behavior. (Default: `1`, Optional).

**Trigger Authentication**
- `username` - Username for basic authentication in GraphQL endpoint instead of embedding in the URL. (Optional)
- `password` - Password for basic authentication in GraphQL endpoint instead of embedding in the URL. (Optional)
- `authType` - Type of authentication to be used. This can be set to `Bearer` or `OAuth2` in case Selenium Grid behind an Ingress proxy with other authentication types. (Optional)
- `accessToken` - Access token. This is required when `authType` is set a value. (Optional)

### Example

Here is a full example of scaled object definition using Selenium Grid trigger:

```yaml
kind: Deployment
metadata:
  name: selenium-node-chrome
  labels:
    deploymentName: selenium-node-chrome
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: selenium-node-chrome
        image: selenium/node-chrome:latest
        ports:
        - containerPort: 5555
        env:
        - name: SE_NODE_BROWSER_VERSION
          value: ''

---

apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: selenium-grid-scaledobject-chrome
  namespace: keda
  labels:
    deploymentName: selenium-node-chrome
spec:
  maxReplicaCount: 8
  scaleTargetRef:
    name: selenium-node-chrome
  triggers:
    - type: selenium-grid
      metadata:
        url: 'http://selenium-hub:4444/graphql'
        browserName: 'chrome'
        platformName: 'Linux'
        unsafeSsl : 'true'
```

Noted:
- From `v2.16.1+`, the trigger metadata `browserVersion`, `platformName` is recommended to be set explicitly to have the correct scaling behavior (especially when your Grid includes autoscaling Nodes, non-autoscaling Nodes, relay Nodes, etc.). Besides that, in client binding, it is also recommended to set the `browserVersion`, `platformName` to align with the trigger metadata. Please see below examples for more details.

The above example will create Chrome browser nodes equal to the requests pending in session queue for Chrome browser, which is created from client. For example in Python binding

```python
options = ChromeOptions()
options.set_capability('platformName', 'Linux')
driver = webdriver.Remote(options=options, command_executor=SELENIUM_GRID_URL)
```

With above script, the request is sent to Grid. Via GraphQL response, it looks like

```json
{
  "data": {
    "grid": {
      "sessionCount": 0,
      "maxSession": 0,
      "totalSlots": 0
    },
    "nodesInfo": {
      "nodes": []
    },
    "sessionsInfo": {
      "sessionQueueRequests": [
        "{\"browserName\": \"chrome\", \"platformName\": \"linux\"}"
      ]
    }
  }
}
```

In Node deployment spec, there is environment variable `SE_NODE_BROWSER_VERSION` which is set to empty. This is used to unset `browserVersion` in Node stereotypes (it is in project [docker-selenium](https://github.com/SeleniumHQ/docker-selenium) setting short browser build number by default), which is expected to match with the request capabilities in queue and scaler trigger metadata.

When the request capabilities match with scaler trigger metadata, the scaler will create a new Node and connect to the Hub. Now the GraphQL response looks like

```json
{
  "data": {
    "grid": {
      "sessionCount": 0,
      "maxSession": 1,
      "totalSlots": 1
    },
    "nodesInfo": {
      "nodes": [
        {
          "id": "UUID-of-Node",
          "status": "UP",
          "sessionCount": 0,
          "maxSession": 1,
          "slotCount": 1,
          "stereotypes": "[{\"slots\": 1, \"stereotype\": {\"browserName\": \"chrome\", \"browserVersion\": \"\", \"platformName\": \"Linux\"}}]",
          "sessions": []
        }
      ]
    },
    "sessionsInfo": {
      "sessionQueueRequests": [
        "{\"browserName\": \"chrome\", \"platformName\": \"linux\"}"
      ]
    }
  }
}
```

Now, the request can be picked up by the Node and the session is created. Session queue will be cleared and the scaler will not create a new Node until the next request comes in.

Moreover, at the same time, you can create one more scaled object for Chrome browser request with specific `browserVersion`. For example

```yaml
kind: Deployment
metadata:
  name: selenium-node-chrome-131
  labels:
    deploymentName: selenium-node-chrome-131
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: selenium-node-chrome
        image: selenium/node-chrome:131.0
        ports:
        - containerPort: 5555

---

apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: selenium-grid-scaledobject-chrome-131
  namespace: keda
  labels:
    deploymentName: selenium-node-chrome-131
spec:
  maxReplicaCount: 8
  scaleTargetRef:
    name: selenium-node-chrome-131
  triggers:
    - type: selenium-grid
      metadata:
        url: 'http://selenium-hub:4444/graphql'
        browserName: 'chrome'
        platformName: 'Linux'
        browserVersion: '131.0'
        unsafeSsl : 'true'
```

The request to trigger this scaler should be

```python
options = ChromeOptions()
options.set_capability('platformName', 'Linux')
options.set_capability('browserVersion', '131.0')
driver = webdriver.Remote(options=options, command_executor=SELENIUM_GRID_URL)
```

Similarly, for Firefox

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: selenium-grid-scaledobject-firefox
  namespace: keda
  labels:
    deploymentName: selenium-node-firefox
spec:
  maxReplicaCount: 8
  scaleTargetRef:
    name: selenium-node-firefox
  triggers:
    - type: selenium-grid
      metadata:
        url: 'http://selenium-hub:4444/graphql'
        browserName: 'firefox'
        platformName: 'Linux'
        unsafeSsl : 'true'
```

Request to trigger the scaler

```python
options = FirefoxOptions()
options.set_capability('platformName', 'Linux')
driver = webdriver.Remote(options=options, command_executor=SELENIUM_GRID_URL)
```

Similarly, for Edge. Note that for Edge you must set the `sessionBrowserName` to `msedge` inorder for scaling to work properly.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: selenium-grid-scaledobject-edge
  namespace: keda
  labels:
    deploymentName: selenium-node-edge
spec:
  maxReplicaCount: 8
  scaleTargetRef:
    name: selenium-node-edge
  triggers:
    - type: selenium-grid
      metadata:
        url: 'http://selenium-hub:4444/graphql'
        browserName: 'MicrosoftEdge'
        sessionBrowserName: 'msedge'
        platformName: 'Linux'
        unsafeSsl : 'true'
```

Request to trigger the scaler

```python
options = EdgeOptions()
options.set_capability('platformName', 'Linux')
driver = webdriver.Remote(options=options, command_executor=SELENIUM_GRID_URL)
```

In case you want to scale from 0 (`minReplicaCount: 0`), and browser nodes are configured different `--max-sessions` greater than 1, you can set `nodeMaxSessions` for scaler align with number of slots available per node to have the correct scaling behavior.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: selenium-grid-chrome-scaledobject
  namespace: keda
  labels:
    deploymentName: selenium-node-chrome
spec:
  maxReplicaCount: 8
  scaleTargetRef:
    name: selenium-node-chrome
  triggers:
    - type: selenium-grid
      metadata:
        url: 'http://selenium-hub:4444/graphql'
        browserName: 'chrome'
        platformName: 'Linux'
        nodeMaxSessions: 4
        unsafeSsl : 'true'
```

If you are supporting multiple versions of browser capability in your Selenium Grid, You should create one scaler for every browser version and pass the `browserVersion` in the metadata.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: selenium-grid-chrome-91-scaledobject
  namespace: keda
  labels:
    deploymentName: selenium-node-chrome-91
spec:
  maxReplicaCount: 8
  scaleTargetRef:
    name: selenium-node-chrome-91
  triggers:
    - type: selenium-grid
      metadata:
        url: 'http://selenium-hub:4444/graphql'
        browserName: 'chrome'
        platformName: 'Linux'
        browserVersion: '91.0'
        unsafeSsl : 'true'
```

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: selenium-grid-chrome-90-scaledobject
  namespace: keda
  labels:
    deploymentName: selenium-node-chrome-90
spec:
  maxReplicaCount: 8
  scaleTargetRef:
    name: selenium-node-chrome-90
  triggers:
    - type: selenium-grid
      metadata:
        url: 'http://selenium-hub:4444/graphql'
        browserName: 'chrome'
        platformName: 'Linux'
        browserVersion: '90.0'
        unsafeSsl : 'true'
```

### Authentication Parameters

It is possible to specify the Graphql url of your Selenium Grid using authentication parameters. This useful if you have enabled Selenium Grid's Basic HTTP Authentication and would like to keep your credentials secure.

- `url` - Graphql url of your Selenium Grid. Refer to the Selenium Grid's documentation [here](https://www.selenium.dev/documentation/en/grid/grid_4/graphql_support/) for more info.
- `username` - Username for basic authentication in GraphQL endpoint instead of embedding in the URL. (Optional)
- `password` - Password for basic authentication in GraphQL endpoint instead of embedding in the URL. (Optional)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: selenium-grid-secret
  namespace: keda
type: Opaque
data:
  graphql-url: base64 encoded value of GraphQL URL
  graphql-username: base64 encoded value of GraphQL Username
  graphql-password: base64 encoded value of GraphQL Password
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-selenium-grid-secret
  namespace: keda
spec:
  secretTargetRef:
  - parameter: url
    name: selenium-grid-secret
    key: graphql-url
  - parameter: username
    name: selenium-grid-secret
    key: graphql-username
  - parameter: password
    name: selenium-grid-secret
    key: graphql-password
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: selenium-grid-chrome-scaledobject
  namespace: keda
  labels:
    deploymentName: selenium-node-chrome
spec:
  maxReplicaCount: 8
  scaleTargetRef:
    name: selenium-node-chrome
  triggers:
    - type: selenium-grid
      metadata:
        browserName: 'chrome'
        platformName: 'Linux'
        unsafeSsl : 'true'
      authenticationRef:
        name: keda-trigger-auth-selenium-grid-secret
```
