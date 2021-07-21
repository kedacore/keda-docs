+++
title = "Selenium Grid Scaler"
availability = "v2.3+"
maintainer = "Volvo Cars"
description = "Scales selenium browser nodes based on number of requests waiting in session queue"
layout = "scaler"
go_file = "selenium_grid_scaler"
+++

### Trigger Specification

This specification describes the `selenium-grid` trigger that scales browser nodes based on number of requests in session queue.

The scaler creates one browser node per pending request in session queue. You will have to create one trigger per browser capability that you would like to support in your selenium grid.

The below is an example trigger configuration for chrome node.

```yaml
triggers:
  - type: selenium-grid
    metadata:
      url: 'http://selenium-hub:4444/graphql'
      browserName: 'chrome'
```

**Parameter list:**

- `url` is graphql url of your selenium grid. Refer to the selenium grid's documentation [here](https://www.selenium.dev/documentation/en/grid/grid_4/graphql_support/) to for more info.
- `browserName` is the name of browser that usually gets passed in the browser capability.

### Example

Here is a full example of scaled object definition using Selenium Grid trigger:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: selenium-grid-chrome-scaledobject
  namespace: keda
  labels:
    deploymentName: selenium-chrome-node
spec:
  maxReplicaCount: 8
  scaleTargetRef:
    name: selenium-chrome-node
  triggers:
    - type: selenium-grid
      metadata:
        url: 'http://selenium-hub:4444/graphql'
        browserName: 'chrome'
```

The above example will create chrome browser nodes equal to the requests pending in session queue for chrome browser.

Similary for firefox

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: selenium-grid-firefox-scaledobject
  namespace: keda
  labels:
    deploymentName: selenium-firefox-node
spec:
  maxReplicaCount: 8
  scaleTargetRef:
    name: selenium-firefox-node
  triggers:
    - type: selenium-grid
      metadata:
        url: 'http://selenium-hub:4444/graphql'
        browserName: 'firefox'
```