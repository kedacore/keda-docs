+++
title = "Openstack Metric"
layout = "scaler"
availability = "v2.3+"
maintainer = "Community"
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
description = "Scale applications based on a threshold reached by a specific measure from Openstack Metric API."
=======
description = "Scale applications based on the metrics collected from an specific resource."
>>>>>>> Create Openstack Metric Scaler docs
=======
description = "Scale applications based on a threshold reached by a specific measure from Openstack Metric API."
>>>>>>> improve openstack metric scaler initial description
=======
description = "Scale applications based on a threshold reached by a specific measure from OpenStack Metric API."
>>>>>>> Update content/docs/2.2/scalers/openstack-metric.md
go_file = "openstack_metric_scaler"
+++

### Trigger Specification
<<<<<<< HEAD
<<<<<<< HEAD
This specification describes the `openstack-metric` trigger for OpenStack metrics.

> The Openstack metric API follows [gnocchi](https://gnocchi.xyz/) API. Attempt to the fact that gnocchi API is an open-source time series database embedded in openstack system and every parameter on Openstack Metric API follows its patterns but you don't need to reference anything from gnocchi. It scales based on a specific measure from a given resource metric.
=======
This specification describes the `openstack-metric` trigger for OpenStack metrics. The Openstack metric API follows [gnocchi](https://gnocchi.xyz/) API. Attempt to the fact that gnocchi api is an open-source time series database embedded in openstack system and every parameter on Openstack Metric API follows it's patterns but you don't need to reference anything from gnocchi. It scales based on an spcific measeure from a given resource metric.
>>>>>>> Create Openstack Metric Scaler docs
=======
This specification describes the `openstack-metric` trigger for OpenStack metrics.

<<<<<<< HEAD
> The Openstack metric API follows [gnocchi](https://gnocchi.xyz/) API. Attempt to the fact that gnocchi API is an open-source time series database embedded in openstack system and every parameter on Openstack Metric API follows its patterns but you don't need to reference anything from gnocchi. It scales based on a specific measure from a given resource metric.
<<<<<<< HEAD
>>>>>>> Update content/docs/2.2/scalers/openstack-metric.md
It's highly recommended to check [gnocchi](https://gnocchi.xyz/) docs.
=======
=======
> The OpenStack metric API follows [Gnocchi](https://gnocchi.xyz/) API. Attempt to the fact that Gnocchi API is an open-source time series database embedded in OpenStack system and every parameter on OpenStack Metric API follows its patterns but you don't need to reference anything from Gnocchi. It scales based on a specific measure from a given resource metric.
>>>>>>> Update content/docs/2.2/scalers/openstack-metric.md
It's highly recommended to check [Gnocchi](https://gnocchi.xyz/) docs.
>>>>>>> Update content/docs/2.2/scalers/openstack-metric.md

```yaml
triggers:
- type: openstack-metric
  metadata:
    metricsURL: http://localhost:8041/v1/metric #required
    metricID: 003bb589-166d-439d-8c31-cbf098d863de #required
    aggregationMethod: "mean" #required
    granularity: 300 #required (seconds)
    threshold: 1250 #required
    timeout: 30 #optional
```

<<<<<<< HEAD
<<<<<<< HEAD
> Protocol (http or https) should always be provided when specifying URLs
=======
> Please, always provide the protocol (http or https) when specifying URLs. This is needed due to Go URL parsing issues :sweat_smile:
>>>>>>> Create Openstack Metric Scaler docs
=======
> Protocol (http or https) should always be provided when specifying URLs
>>>>>>> Update content/docs/2.2/scalers/openstack-metric.md

**Parameter list:**
- `metricsURL` - The URL to check for the metrics API, based. It must contain the hostname, the metric port, the API version, and the resource ID. The pattern is: `http://<host>:<metric_port>/<openstack_metric_api_version>/<resource_id>/metric` 
- `metricID` - The Id of the intendend metric
- `aggregationMethod` - The aggregation method that will be used to calculate metrics, it must follows the configured possible metrics derived from gnocchi API like: `mean`, `min`, `max`, `std`, `sum`, `count`, the complete aggregation methods list can be found [here](https://gnocchi.xyz/rest.html#archive-policy).
- `granularity` - The configured granularity from metric collection in seconds. it must follow the same value configured in OpenStack, but it must be coutned in seconds. Sample: If you have a 5 minutes time window granularity defined, so you must input a value of 300 seconds (5*60).
- `threshold` - The target value that, when reached, will scale the application.
- `timeout` - The timeout, in seconds, for the HTTP client requests that will query the Metric API. If not specified, the default value is `30` seconds. This must be an integer value. If `0` or negative value is provided it defaults to `300` milliseconds.

### Authentication Parameters

To authenticate, this scaler uses tokens. Tokens are automatically retrieved by the scaler from [Keystone](https://docs.openstack.org/keystone/latest/), the official OpenStack Identity Provider. You can provide your credentials using Secrets either by using the "password" method or the "application credentials" method. Both cases use `TriggerAuthentication`.

#### Password

- `authURL` - The Keystone authentication URL. The pattern is: `http://<host>:<keystone_port>/<keystone_version>/`
- `userID` - The OpenStack project user ID
- `password` - The password for the provided user
- `projectID` - The OpenStack project ID

#### Application Credentials

- `authURL` - The Keystone authentication URL. The pattern is: `http://<host>:<keystone_port>/<keystone_version>/`
- `appCredentialID` - The Application Credential ID
- `appCredentialSecret` - The Application Credential secret

### Example

#### Password method

Here is an example of how to deploy a scaled object with the `openstack-metric` scale trigger which uses `TriggerAuthentication` and the Password method from above.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: openstack-secret-password
  namespace: default
type: Opaque
data:
  authURL: aHR0cDovL2xvY2FsaG9zdDo1MDAwL3YzLw==
  userID: MWYwYzI3ODFiNDExNGQxM2E0NGI4ODk4Zjg1MzQwYmU=
  password: YWRtaW4=
  projectID: YjE2MWRjNTE4Y2QyNGJkYTg0ZDk0ZDlhMGU3M2ZjODc=
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: metrics-password-trigger-authentication
  namespace: default
spec:
  secretTargetRef:
  - parameter: authURL
    name: openstack-secret-password
    key: authURL
  - parameter: userID
    name: openstack-secret-password
    key: userID
  - parameter: password
    name: openstack-secret-password
    key: password
  - parameter: projectID
    name: openstack-secret-password
    key: projectID
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: openstack-metric-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: my-deployment
  pollingInterval: 10
  cooldownPeriod: 10
  minReplicaCount: 0
  triggers:
  - type: openstack-metric
    metadata:
      metricsURL: http://localhost:8041/v1/metric 
      metricID: faf01aa5-da88-4929-905d-b83fbab46771
      aggregationMethod: "mean"
      granularity: 300 
      threshold: 1250 
      timeout: 30 
    authenticationRef:
        name: openstack-metric-password-trigger-authentication
```

#### Application Credentials method

You can also use the Application Credentials method. 

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: openstack-secret-appcredentials
  namespace: default
type: Opaque
data:
  authURL: aHR0cDovL2xvY2FsaG9zdDo1MDAwL3YzLw==
  appCredentialID: OWYyY2UyYWRlYmFkNGQxNzg0NTgwZjE5ZTljMTExZTQ=
  appCredentialSecret: LVdSbFJBZW9sMm91Z3VmZzNEVlBqcll6aU9za1pkZ3c4Y180XzRFU1pZREloT0RmajJkOHg0dU5yb3NudVIzWmxDVTZNLTVDT3R5NDFJX3M5R1N5Wnc=
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: openstack-metric-appcredentials-trigger-authentication
  namespace: default
spec:
  secretTargetRef:
  - parameter: authURL
    name: openstack-secret-appcredentials
    key: authURL
  - parameter: appCredentialID
    name: openstack-secret-appcredentials
    key: appCredentialID
  - parameter: appCredentialSecret
    name: openstack-secret-appcredentials
    key: appCredentialSecret
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: openstack-metric-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: my-deployment
  pollingInterval: 10
  cooldownPeriod: 10
  minReplicaCount: 0
  triggers:
  - type: openstack-metric
    metadata:
       metricsURL: http://localhost:8041/v1/metric 
      metricID: faf01aa5-da88-4929-905d-b83fbab46771
      aggregationMethod: "mean"
      granularity: 300 
      threshold: 1250
    authenticationRef:
        name: openstack-metric-appcredentials-trigger-authentication
<<<<<<< HEAD
<<<<<<< HEAD
```
=======
```
>>>>>>> Create Openstack Metric Scaler docs
=======
```
>>>>>>> Update content/docs/2.2/scalers/openstack-metric.md
