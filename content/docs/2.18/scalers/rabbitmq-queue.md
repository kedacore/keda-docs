+++
title = "RabbitMQ Queue"
availability = "v1.0+"
maintainer = "Microsoft"
category = "Messaging"
description = "Scale applications based on RabbitMQ Queue."
go_file = "rabbitmq_scaler"
+++

### Trigger Specification

This specification describes the `rabbitmq` trigger for RabbitMQ queue.

```yaml
triggers:
- type: rabbitmq
  metadata:
    host: amqp://<host>:<port>/<vhost> # Optional. If not specified, it must be done by using TriggerAuthentication.
    protocol: auto # Optional. Specifies protocol to use, either `amqp`, `http`, or `auto` for auto-detection based on the `host` value. Default value is `auto`.
    mode: QueueLength # Supported modes are `QueueLength`, `MessageRate`, `DeliverGetRate`, `PublishedToDeliveredRatio` or `ExpectedQueueConsumptionTime`
    value: "100.50" # A value defining the threshold (per instance) that, when exceeded, triggers the scaling.
    activationValue: "10.5" # Optional. Activation threshold, which by default is 0.
    queueName: testqueue # Name of the queue.
    vhostName: / # Optional. If not specified, use the VHost in the `host` connection string. Required for Azure AD Workload Identity authorization (see below).
    # You can use existing environment variables to read configuration from. For details see "Parameters list" section.
    hostFromEnv: RABBITMQ_HOST # Optional. You can use this instead of `host` parameter.
    usernameFromEnv: RABBITMQ_USERNAME # Optional. You can use this instead of `TriggerAuthentication`.
    passwordFromEnv: RABBITMQ_PASSWORD # Optional. You can use this instead of `TriggerAuthentication`.
    unsafeSsl: true # Optional. Whether to allow unsafe SSL connections.
    timeout: 1000 # Optional. Custom timeout for the HTTP client used in this scaler.
```

**Parameters list:**

- `host` - RabbitMQ host address in the format `<protocol>://<host>:<port>/vhost`. If the protocol is HTTP than the host may follow this format `http://<host>:<port>/<path>/<vhost>`. In example, the resolved host value could be `amqp://guest:password@localhost:5672/vhost` or `http://guest:password@localhost:15672/path/vhost`. If the host doesn't contain `vhost`, then the trailing slash is required, e.g. `http://guest:password@localhost:5672/`. When using a username with password consider using `hostFromEnv` or a `TriggerAuthentication`.
- `queueName` - Name of the queue to read required information and stats from.
- `mode` - Trigger mode. See [Choosing the right trigger mode](#choosing-the-right-trigger-mode) for additional details. Can be one of:
  - `QueueLength` - trigger on number of messages in the queue
  - `MessageRate` - trigger on the publishing rate reported by the queue
  - `DeliverGetRate` - trigger on the rate of delivered messages (to consumers or in response to `basic.get`, both acknowledged and not) reported by the queue
  - `PublishedToDeliveredRatio` - trigger on the value of ratio of `MessageRate` to `DeliverGetRate`
  - `ExpectedQueueConsumptionTime` - trigger on the value of expected time (in seconds) of consumption of all messages currently available in the queue (utilizes `QueueLength`, `MessageRate` and `DeliverGetRate` metrics).
- `value` - A value defining the threshold (per instance) that, when exceeded, triggers the scaling (can be a floating-point number depending on the trigger mode).
- `activationValue` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds) (default: `0`; optional; can be a floating-point number).
- `protocol` - Protocol to be used for communication (values: `auto`, `http`, `amqp`; default: `auto`; optional).
- `vhostName` - VHost to use for the connection, overrides any VHost set in the connection string from `host`/`hostFromEnv` (it's optional by default but **it is required** if Azure AD Workload Identity authorization is used).
- `queueLength` - **DEPRECATED: please use `mode: QueueLength` and `value: ##` instead**. Defines a threshold value for the queue length passed to the scaler. For example: if one pod can handle 10 messages, set the queue length target to `10`. If the actual number of messages in the queue is 30, the scaler will scale up to 3 pods. Default is set to `20` unless `publishRate` is specified, in which case `queueLength` is disabled for this trigger.
- `useRegex` - This parameter allows to use regex (in `queueName` parameter) to select queue instead of using full name (values: `true`, `false`; default: `false`; optional; only applies to hosts that use the `http` protocol).
- `pageSize` - This parameter allows setting the page size (default: `100`; optional; only applies when `useRegex` is set to `true`).
- `operation` - Operation that will be applied to compute the number of messages in case when `useRegex` is enabled (values: `sum`, `max`, `avg`; defaults: `sum`; optional).
- `timeout` - Timeout in milliseconds **for this specific trigger**. This value will override the value defined in `KEDA_HTTP_DEFAULT_TIMEOUT` (optional; only applies to hosts that use the `http` protocol).
- `excludeUnacknowledged` - Set to `true` to specify that the `QueueLength` value should exclude unacknowledged messages (ready messages only; values:`true`, `false`; default: `false`; optional; only applies to hosts that use the `http` protocol).
- `unsafeSsl` - Whether to allow unsafe SSL connections (values: `true`, `false`, default: `false`).

Some parameters can be provided using environment variables instead of setting them directly in metadata:
- `hostFromEnv` - reads the host and port of the RabbitMQ server from selected environment variable (in similar format as `host` parameter)
- `usernameFromEnv` - reads the username from selected environment variable, which is used to connect to the broker’s management endpoint
- `passwordFromEnv` - reads the password from selected environment variable, which is used to connect to the broker’s management endpoint.

> 💡 **Notes:** 
> - `host`/`hostFromEnv` has an optional VHost name after the host slash which will be used to scope API request
> - when using `host`/`hostFromEnv` or `TriggerAuthentication`, the supplied password cannot contain special characters
> - trigger modes `MessageRate`, `DeliverGetRate`, `PublishedToDeliveredRatio` and `ExpectedQueueConsumptionTime` require `http` protocol.
> - setting `useRegex` to `true` also requires `protocol` to be set to `http`.

> ⚠ **Important:**
> - If you have unacknowledged messages and you want to have these counted for the scaling to happen, make sure to utilize the `http` protocol (only REST API interface allows for these to be counted).
> - If scaling against many is desired, then the `ScaledObject` should have all desired triggers defined. HPA will scale based on the largest result considering each of triggers independently.

### Choosing the right trigger mode

Below you can find available trigger modes with most common usage scenarios:
- `QueueLength` - Mainly used to scale messages consuming services, where it is desired to keep number of messages in the queue at selected, nominal level.
- `MessageRate` - Mainly used to scale messages consuming services, where it is desired to keep the consumption rate up to messages publication rate (or higher).
- `DeliverGetRate` - This specific trigger is actually a byproduct of the resulting implementation of `PublishedToDeliveredRatio` trigger (it was implemented to be used within `scalingModifiers` as a part of composite metric), yet it still has its use in some scenarios. E.g. assuming there's a well known consumer service performance ballpark, `DeliverGetRate` trigger can be utilized to scale out messages publishing service in order to increase publication rate. In this particular example however, upper publication rate limit must be properly guarded by another trigger or by [`maxReplicaCount`](./../reference/scaledobject-spec/#maxreplicacount) so as not to scale infinitely (which could result in overloading the broker, or consumers, or both).
- `PublishedToDeliveredRatio` - This trigger is used mainly to control consumer pods scaling to keep publishing and consuming rates at stable level. Assuming that this is the case, the principle of operation is this:
  - if publishing rate is greater than `value` (usually it is a value slightly above `1`), trigger will initiate scale-out process to launch more consumer pods
  - if publishing rate is equal to consumption rate (value `1`) then it is the indicator that capacity of consumers is sufficient for handling ongoing messages processing and no additional pods need to be added to the pool
  - if ratio is below `1`, HPA can gracefully take down some consumers but keep messages processing rate at stable level.
- `ExpectedQueueConsumptionTime` - A trigger primarily used to scale consumer pods, which uses estimate value of pending time to deliver all available messages in the queue to the consumers. If it becomes active in this particular scenario, returned metric indicates growing number of messages due either increased publishing rate or degraded performance of currently active number of consumers. It relies on proper setting of `pollingInterval` (see below for details).

> ⚠ **Important:**
> - With `DeliverGetRate`, `PublishedToDeliveredRatio` and `ExpectedQueueConsumptionTime` it is advised to set `metricType: Value` in the trigger configuration to rely on absolute metric value and not the average value across all scaled pods. For reference see [`triggers.metricType`](./../reference/scaledobject-spec/#triggers) and [`scalingModifiers.metricType`](./../reference/scaledobject-spec/#scalingmodifiersmetrictype).
> - When using `PublishedToDeliveredRatio`, having stable publication to consumption rate may not indicate that consumers pool is of the right size to do the job, since the messages consuming capabilities can change over time, which may result in much higher number of consumers than actually needed. It is then recommended to periodically re-evaluate consumers pool size using different, probably external metric (e.g. consumers count number, size of prefetch buffer, consumer performance, etc.).
> - Since `ExpectedQueueConsumptionTime` trigger mode is based on the expected time (in seconds) for the selected queue to be emptied of all messages (including estimated count of published messages during sample probing), it must be served with `pollingInterval` set to 1 second. However, in case where such frequent polling may be expensive, it is recommended to use `ExpectedQueueConsumptionTime` in `scalingModifiers` using additional triggers values in formula like so: `(ExpectedQueueConsumptionTime - (QueueLength / DeliverGetRate)) * pollingInterval + (QueueLength / DeliverGetRate)`.

### Authentication Parameters

`TriggerAuthentication` CRD is used to connect and authenticate to RabbitMQ:
- For AMQP, the URI should look similar to `amqp://guest:password@localhost:5672/vhost`.
- For HTTP, the URI should look similar to `http://guest:password@localhost:15672/path/vhost`.
  > See the [RabbitMQ Ports](https://www.rabbitmq.com/networking.html#ports) section for more details on how to configure the ports.
- `vhostName` - VHost to use for the connection, overrides any VHost set in the connection string from `host`/`hostFromEnv` (optional, but **required** if Azure AD Workload Identity authorization is used).

#### Username and Password based authentication

This allows sensitive credentials to be stored and managed separately from the connection string:
- `username` - The username to use to connect to the broker's management endpoint.
- `password` - The password to use to connect to the broker's management endpoint.

> 💡 **Note:** If username or password are set in `TriggerAuthentication` or environment variables, they will override any credentials provided in the `host` parameter.

#### TLS authentication

- `tls` - To enable SSL auth for RabbitMQ, set this to `enable`. If not set, TLS for RabbitMQ will not be used. Valid values are `enable` or `disable` (optional; the default is `disable`).
- `ca` - Certificate authority file for TLS client authentication (optional).
- `cert` - Certificate for client authentication (optional).
- `key` - Certificate Key for client authentication (optional).

> 💡 **Note:** Using RabbitMQ host with AMQPS protocol will require enabling the TLS settings and passing the required parameters.

#### Azure Workload Identity authentication

For RabbitMQ with OIDC support (>= 3.11) you can use `TriggerAuthentication` CRD with `podIdentity.provider = azure-workload` and with `workloadIdentityResource` parameter, which will hold application identifier of App Registration in Azure AD. In this case `username:password` part in host URI should be omitted and `vHostName` has to be set explicitly in `ScaledObject`. Currently, only HTTP protocol is supported for AKS Workload Identity.

### Configuration examples

#### AMQP protocol:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-rabbitmq-secret
data:
  host: <AMQP URI connection string> # base64 encoded value of format amqp://guest:password@localhost:5672
  vhostName: vhost
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-rabbitmq-conn
  namespace: default
spec:
  secretTargetRef:
    - parameter: host
      name: keda-rabbitmq-secret
      key: host
    - parameter: vhostName
      name: keda-rabbitmq-secret
      key: vhostName
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: rabbitmq-deployment
  triggers:
  - type: rabbitmq
    metadata:
      protocol: amqp
      queueName: testqueue
      mode: QueueLength
      value: "20"
    authenticationRef:
      name: keda-trigger-auth-rabbitmq-conn
```

#### AMQP protocol with username and password authorization:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-rabbitmq-secret
data:
  host: <AMQP URI connection string> # base64 encoded value of format amqp://localhost:5672/vhost (no username/password)
  username: <username> # base64 encoded value of username
  password: <password> # base64 encoded value of password
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-rabbitmq-conn
  namespace: default
spec:
  secretTargetRef:
    - parameter: host
      name: keda-rabbitmq-secret
      key: host
    - parameter: username
      name: keda-rabbitmq-secret
      key: username
    - parameter: password
      name: keda-rabbitmq-secret
      key: password 
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: rabbitmq-deployment
  triggers:
  - type: rabbitmq
    metadata:
      protocol: amqp
      queueName: testqueue
      mode: QueueLength
      value: "20"
    authenticationRef:
      name: keda-trigger-auth-rabbitmq-conn
```

#### AMQPS protocol with TLS authorization:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-rabbitmq-secret
data:
  host: <AMQPS URI connection string> # base64 encoded value of format amqps://guest:password@localhost:5672/vhost
  tls: "enable"
  ca: <your ca>
  cert: <your cert>
  key: <your key>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-rabbitmq-conn
  namespace: default
spec:
  secretTargetRef:
    - parameter: host
      name: keda-rabbitmq-secret
      key: host
    - parameter: tls
      name: keda-rabbitmq-secret
      key: tls
    - parameter: ca
      name: keda-rabbitmq-secret
      key: ca
    - parameter: cert
      name: keda-rabbitmq-secret
      key: cert
    - parameter: key
      name: keda-rabbitmq-secret
      key: key
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: rabbitmq-deployment
  triggers:
  - type: rabbitmq
    metadata:
      protocol: amqp
      queueName: testqueue
      mode: QueueLength
      value: "20"
    authenticationRef:
      name: keda-trigger-auth-rabbitmq-conn
```

#### HTTP protocol (with `QueueLength` trigger):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-rabbitmq-secret
data:
  host: <HTTP API endpoint> # base64 encoded value of format http://guest:password@localhost:15672/path/vhost
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-rabbitmq-conn
  namespace: default
spec:
  secretTargetRef:
    - parameter: host
      name: keda-rabbitmq-secret
      key: host
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: rabbitmq-deployment
  triggers:
  - type: rabbitmq
    metadata:
      protocol: http
      queueName: testqueue
      mode: QueueLength
      value: "20"
    authenticationRef:
      name: keda-trigger-auth-rabbitmq-conn
```

#### HTTP protocol (with `MessageRate` and `QueueLength` triggers):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-rabbitmq-secret
data:
  host: <HTTP API endpoint> # base64 encoded value of format http://guest:password@localhost:15672/path/vhost
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-rabbitmq-conn
  namespace: default
spec:
  secretTargetRef:
    - parameter: host
      name: keda-rabbitmq-secret
      key: host
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: rabbitmq-deployment
  triggers:
  - type: rabbitmq
    metadata:
      protocol: http
      queueName: testqueue
      mode: QueueLength
      value: "20"
    authenticationRef:
      name: keda-trigger-auth-rabbitmq-conn
  - type: rabbitmq
    metadata:
      protocol: http
      queueName: testqueue
      mode: MessageRate
      value: "100"
    authenticationRef:
      name: keda-trigger-auth-rabbitmq-conn
```

#### HTTP protocol (with `QueueLength` trigger) and enabled `useRegex`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-rabbitmq-secret
data:
  host: <HTTP API endpoint> # base64 encoded value of format http://guest:password@localhost:15672/path/vhost
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-rabbitmq-conn
  namespace: default
spec:
  secretTargetRef:
    - parameter: host
      name: keda-rabbitmq-secret
      key: host
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: rabbitmq-deployment
  triggers:
  - type: rabbitmq
    metadata:
      protocol: http
      queueName: ^.*incoming$
      mode: QueueLength
      value: "20"
      useRegex: "true"
      operation: max
    authenticationRef:
      name: keda-trigger-auth-rabbitmq-conn
```

#### HTTP protocol (with `QueueLength` trigger) with Azure Workload Identity:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-rabbitmq-secret
data:
  host: <HTTP API endpoint> # base64 encoded value of format http://localhost:15672/ !! no password !!
  clientId: <RabbitMQ AzureAD App Registration Client ID> # base64 encoded value of Client ID (same as for Rabbit's auth_oauth2.resource_server_id)
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-rabbitmq-conn
  namespace: default
spec:
  podIdentity:
    provider: azure-workload
  secretTargetRef:
    - parameter: host
      name: keda-rabbitmq-secret
      key: host
    - parameter: workloadIdentityResource
      name: keda-rabbitmq-secret
      key: clientId
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: rabbitmq-deployment
  triggers:
  - type: rabbitmq
    metadata:
      protocol: http
      vHostName: /
      queueName: testqueue
      mode: QueueLength
      value: "20"
    authenticationRef:
      name: keda-trigger-auth-rabbitmq-conn
```

#### HTTP protocol (with `DeliverGetRate` trigger)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-rabbitmq-secret
data:
  host: <HTTP API endpoint> # base64 encoded value of format http://guest:password@localhost:15672/path/vhost
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-rabbitmq-conn
  namespace: default
spec:
  secretTargetRef:
    - parameter: host
      name: keda-rabbitmq-secret
      key: host
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: rabbitmq-deployment
  triggers:
  - type: rabbitmq
    metricType: Value
    metadata:
      protocol: http
      queueName: testqueue
      mode: DeliverGetRate
      value: "30"
    authenticationRef:
      name: rabbitmq-trigger-auth
```

#### HTTP protocol (with `PublishedToDeliveredRatio` trigger)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-rabbitmq-secret
data:
  host: <HTTP API endpoint> # base64 encoded value of format http://guest:password@localhost:15672/path/vhost
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-rabbitmq-conn
  namespace: default
spec:
  secretTargetRef:
    - parameter: host
      name: keda-rabbitmq-secret
      key: host
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: rabbitmq-deployment
  triggers:
  - type: rabbitmq
    metricType: Value
    metadata:
      protocol: http
      queueName: testqueue
      mode: PublishedToDeliveredRatio
      value: "1.1"
    authenticationRef:
      name: rabbitmq-trigger-auth
```

#### HTTP protocol (with `PublishedToDeliveredRatio` trigger used together with `scalingModifiers`)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-rabbitmq-secret
data:
  host: <HTTP API endpoint> # base64 encoded value of format http://guest:password@localhost:15672/path/vhost
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-rabbitmq-conn
  namespace: default
spec:
  secretTargetRef:
    - parameter: host
      name: keda-rabbitmq-secret
      key: host
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: rabbitmq-deployment
  triggers:
  - type: rabbitmq
    metricType: Value
    name: p2d_ratio
    metadata:
      protocol: http
      queueName: testqueue
      mode: PublishedToDeliveredRatio
      value: "1"
    authenticationRef:
      name: rabbitmq-trigger-auth
  - type: rabbitmq
    name: qlen
    metadata:
      protocol: http
      queueName: testqueue
      mode: QueueLength
      value: "100"
    authenticationRef:
      name: rabbitmq-trigger-auth
  advanced:
    # Bind QueueLength and PublishedToDeliveredRatio together to control trigger value
    scalingModifiers:
      metricType: Value
      # Trigger if either one of conditions is met:
      # - publishing to delivery rate exceeds factor of 1.2
      # - queue length contains more than 1.2K messages
      formula: "max(p2d_ratio, qlen/1000)"
      target: 1.2
```

#### HTTP protocol (with `ExpectedQueueConsumptionTime` trigger)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-rabbitmq-secret
data:
  host: <HTTP API endpoint> # base64 encoded value of format http://guest:password@localhost:15672/path/vhost
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-rabbitmq-conn
  namespace: default
spec:
  secretTargetRef:
    - parameter: host
      name: keda-rabbitmq-secret
      key: host
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: rabbitmq-deployment
  pollingInterval: 1
  triggers:
  - type: rabbitmq
    metricType: Value
    name: eqct
    metadata:
      protocol: http
      queueName: testqueue
      mode: ExpectedQueueConsumptionTime
      value: "20"
    authenticationRef:
      name: rabbitmq-trigger-auth
```
