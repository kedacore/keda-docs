+++
title = "RabbitMQ Queue"
availability = "v1.0+"
maintainer = "Microsoft"
description = "Scale applications based on RabbitMQ Queue."
go_file = "rabbitmq_scaler"
+++

### Trigger Specification

This specification describes the `rabbitmq` trigger for RabbitMQ Queue.

```yaml
triggers:
- type: rabbitmq
  metadata:
    host: amqp://localhost:5672/vhost # Optional. If not specified, it must be done by using TriggerAuthentication.
    protocol: auto # Optional. Specifies protocol to use, either amqp or http, or auto to autodetect based on the `host` value. Default value is auto.
    mode: QueueLength # QueueLength or MessageRate
    value: "100.50" # message backlog or publish/sec. target per instance
    activationValue: "10.5" # Optional. Activation threshold
    queueName: testqueue
    vhostName: / # Optional. If not specified, use the vhost in the `host` connection string. Required for Azure AD Workload Identity authorization (see bellow)
    # Alternatively, you can use existing environment variables to read configuration from:
    # See details in "Parameter list" section
    hostFromEnv: RABBITMQ_HOST # Optional. You can use this instead of `host` parameter
    unsafeSsl: true
```

**Parameter list:**

- `host` - Host of RabbitMQ with format `<protocol>://<host>:<port>/vhost`. If the protocol is HTTP than the host may follow this format `http://<host>:<port>/<path>/<vhost>`. In example the resolved host value could be `amqp://guest:password@localhost:5672/vhost` or `http://guest:password@localhost:15672/path/vhost`. If the host doesn't contain vhost than the trailing slash is required in this case like `http://guest:password@localhost:5672/`. When using a username/password consider using `hostFromEnv` or a TriggerAuthentication.
- `queueName` - Name of the queue to read message from.
- `mode` - QueueLength to trigger on number of messages in the queue. MessageRate to trigger on the published rate into the queue. (Values: `QueueLength`, `MessageRate`)
- `value` - Message backlog or Publish/sec. rate to trigger on. (This value can be a float when `mode: MessageRate`)
- `activationValue` - Target value for activating the scaler. Learn more about activation [here](./../concepts/scaling-deployments.md#activating-and-scaling-thresholds).(Default: `0`, Optional, This value can be a float)
- `protocol` - Protocol to be used for communication. (Values: `auto`, `http`, `amqp`, Default: `auto`, Optional)
- `vhostName` - Vhost to use for the connection, overrides any vhost set in the connection string from `host`/`hostFromEnv`. (Optional / Required if Azure AD Workload Identity authorization is used)
- `queueLength` - DEPRECATED! Use `mode: QueueLength` and `value: ##` instead. Target value for queue length passed to the scaler. Example: if one pod can handle 10 messages, set the queue length target to 10. If the actual number of messages in the queue is 30, the scaler scales to 3 pods. Default is 20 unless `publishRate` is specified, in which case `queueLength` is disabled for this trigger.
- `useRegex` - This parameter allows to use regex (in `queueName` parameter) to select queue instead of full name. (Values: `true`, `false`, Default: `false`, Optional, Only applies to hosts that use the `http` protocol)
- `pageSize` - This parameter allows setting page size. (Default: `100`, Optional, Only applies when `useRegex` is `true`)
- `operation` - Operation that will be applied to compute the number of messages in case of `useRegex` enabled. Either `sum` (default),`max`, or `avg`. (Optional)
- `metricName` - Name to assign to the metric. If not set KEDA will generate a name based on the queue name. If using more than one trigger it is required that all metricNames be unique. (DEPRECATED: This parameter is deprecated as of KEDA v2.10 and will be removed in version `2.12`)
- `timeout` - Timeout **for this specific trigger**. This value will override the value defined in `KEDA_HTTP_DEFAULT_TIMEOUT`. (Optional, Only applies to hosts that use the `http` protocol)
- `excludeUnacknowledged` - Set to `true` to specify that the `QueueLength` value should exclude unacknowledged messages (Ready messages only). (Values: `true`, `false`, Default: `false`, Optional, Only applies to hosts that use the `http` protocol)
- `unsafeSsl` - Whether to allow unsafe SSL (Values: `true`, `false`, Default: `false` )

Some parameters could be provided using environmental variables, instead of setting them directly in metadata. Here is a list of parameters you can use to retrieve values from environment variables:

- `hostFromEnv` - The host and port of the RabbitMQ server, similar to `host`, but reads it from an environment variable on the scale target.

> 💡 **Note:** `host`/`hostFromEnv` has an optional vhost name after the host slash which will be used to scope API request.

> 💡 **Note:** When using `host`/`hostFromEnv` or TriggerAuthentication, the supplied password cannot contain special characters.

> 💡 **Note:** `mode: MessageRate` requires protocol `http`.

> 💡 **Note:** `useRegex: "true"` requires protocol `http`.

> ⚠ **Important:** if you have unacknowledged messages and want to have these counted for the scaling to happen, make sure to utilize the `http` REST API interface which allows for these to be counted.

> ⚠ **Important:** If scaling against both is desired then the `ScaledObject` should have two triggers, one for `mode: QueueLength` and the other for `mode: MessageRate`. HPA will scale based on the largest result considering each of the two triggers independently.

### Authentication Parameters

TriggerAuthentication CRD is used to connect and authenticate to RabbitMQ:

- For AMQP, the URI should look similar to `amqp://guest:password@localhost:5672/vhost`.
- For HTTP, the URI should look similar to `http://guest:password@localhost:15672/path/vhost`.

> See the [RabbitMQ Ports](https://www.rabbitmq.com/networking.html#ports) section for more details on how to configure the ports.

**TLS authentication:**

- `tls` - To enable SSL auth for RabbitMQ, set this to `enable`. If not set, TLS for RabbitMQ is not used. (Values: `enable`, `disable`, Default: `disable`, Optional)
- `ca` - Certificate authority file for TLS client authentication. (Optional)
- `cert` - Certificate for client authentication. (Optional)
- `key` - Key for client authentication. (Optional)

> Using RabbitMQ host with amqps will require enabling the tls settings and passing the required parameters.

**Azure Workload Identity authentication:**

For RabbitMQ with OIDC support (>= 3.11) you can use TriggerAuthentication CRD with `podIdentity.provider = azure-workload` and with parameter `workloadIdentityResource` which would hold application identifier of App Registraion in Azure AD. In this case `username:password` part in host URI should be ommited and `vHostName` has to be set explicitly in `ScaledObject`. Only HTTP protocol is supported for AKS Workload Identity currently.

### Example

#### AMQP protocol:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: keda-rabbitmq-secret
data:
  host: <AMQP URI connection string> # base64 encoded value of format amqp://guest:password@localhost:5672/vhost
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
      protocol: amqp
      queueName: testqueue
      mode: QueueLength
      value: "20"
      metricName: custom-testqueue # DEPRECATED: This parameter is deprecated as of KEDA v2.10 and will be removed in version `2.12`. optional. Generated value would be `rabbitmq-custom-testqueue`
    authenticationRef:
      name: keda-trigger-auth-rabbitmq-conn
```

#### AMQPS protocol with TLS auth:

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
      metricName: custom-testqueue # DEPRECATED: This parameter is deprecated as of KEDA v2.10 and will be removed in version `2.12`. optional. Generated value would be `rabbitmq-custom-testqueue`
    authenticationRef:
      name: keda-trigger-auth-rabbitmq-conn
```

#### HTTP protocol (`QueueLength`):

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

#### HTTP protocol (`MessageRate` and `QueueLength`):

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

#### HTTP protocol (`QueueLength`) and using regex (`useRegex`):

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

#### HTTP protocol (`QueueLength`) with Azure Workload Identity:

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
