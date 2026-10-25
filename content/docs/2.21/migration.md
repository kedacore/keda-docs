+++
title = "Migration Guide"
+++

## Upgrading from KEDA 2.20 to 2.21

KEDA 2.21 includes breaking changes that require review before upgrading:

- [Service account token audiences](#service-account-token-audiences)
- [Azure Pipelines in-flight jobs](#azure-pipelines-in-flight-jobs)
- [Temporal Rules-Based Versioning settings](#temporal-rules-based-versioning-settings)

### Service account token audiences

KEDA 2.21 defaults to `operator.serviceAccountTokens.mode: enforce-audience`. This is a breaking change for Vault Kubernetes authentication and **all** `boundServiceAccountToken` (BSAT) authentication, not just Vault. Missing approvals or service-account audience mappings fail the affected authentication. The operator can remain healthy while individual scalers fail.

| Existing configuration | Required migration |
| --- | --- |
| Vault using the operator's default API token | Use the chart's dedicated projected token and configure the matching Vault login audience; stop selecting the API-token file |
| Vault using extra projected volumes or other token files | Keep the mounts and TA paths, approve their non-API audiences, and ensure the tokens expire and rotate |
| Vault using `credential.serviceAccountName` | Add an audience mapping for that service account and configure the Vault role/reviewer |
| BSAT supplied to metrics-api, Prometheus, Loki, Datadog Cluster Agent, or another scaler | Map the service account to an audience and verify the receiver accepts it |
| Vault ordinary-token authentication, Datadog REST API/app keys, or other non-BSAT authentication | No audience migration required by this change |

Using a listed scaler does not itself require migration: its **authentication source** determines the impact. A cluster without legitimate Vault use can still benefit from the fix if untrusted users can create or reference authentication and scaling resources.

### Before upgrading

1. Inventory both TriggerAuthentications and ClusterTriggerAuthentications using `spec.hashiCorpVault.authentication: kubernetes` or `spec.boundServiceAccountToken`. Review default and explicit token paths, existing extra volumes, and token-creation RBAC.
2. Choose audiences that your Kubernetes API server does **not** accept. Configure each receiver to accept its intended audience and retain its authorization policy. KEDA's approval alone does not make a receiver compatible.
3. For Vault, configure a separate API-valid TokenReview credential, such as Vault's own service account. Do not use the dedicated login token to authenticate Vault's TokenReview request. Prefer adding a new Vault role so existing clients keep working during migration.
4. Prepare complete reviewed Helm values, retaining installation-specific settings. Upgrade the chart and operator together to matching fixed versions.
5. Verify receiver readiness in a test environment before changing production. For low-disruption Vault file migration, pre-stage a dedicated projection through existing extra-volume values and move TAs to its path/new Vault role before the operator upgrade. These new chart audience controls are not supported by the old operator.

### Vault using the operator service account

The 2.21 chart has these defaults:

```yaml
operator:
  serviceAccountTokens:
    mode: enforce-audience
hashiCorpVault:
  kubernetesAuth:
    audience: vault
    projectedTokenMountPath: /var/run/secrets/keda-vault
```

The chart projects a rotating token for the operator Pod's service account, leaves its API token intact, and adds no token-creation RBAC. Configure the Vault role to accept `vault`, or change the chart audience to match a dedicated audience already accepted by your Vault role. This audience is automatically approved; a custom value does not need a duplicate `additionalAllowedAudiences` entry. The chart does not update Vault itself.

In each affected TA/CTA, omit the **entire** `credential` object to select the new default file, or explicitly set `credential.serviceAccount: /var/run/secrets/keda-vault/token`. Leaving the original API-token path or an empty `credential: {}` is not equivalent to selecting the default.

### Vault using existing extra volumes

Keep existing mounts and paths if their tokens already have appropriate audiences. Add approvals without creating replacement mounts:

```yaml
operator:
  serviceAccountTokens:
    additionalAllowedAudiences:
      - vault-a
      - vault-b
```

Each actual token must have an expiry and only approved audiences. A projection with no explicit audience normally targets the API server and must be replaced or reconfigured; do not simply approve its API audience. KEDA does not rewrite extra volumes or rotate tokens supplied through external Secrets or storage. If all Vault tokens are supplied through existing mounts, you can set `hashiCorpVault.kubernetesAuth.audience: ""` to omit the unused default projection. See [Vault token files](../operate/security/#vault-token-files).

### Named service accounts and BSAT

Configure an exact namespace/name mapping for each minted token. Use a dedicated service account with only the permissions each receiver needs. These values rely on the default `enforce-audience` mode; switch back from `legacy` when the receiver is ready:

```yaml
permissions:
  operator:
    restrict:
      serviceAccountTokenCreationRoles:
        - name: vault-login
          namespace: apps
          audience: vault
        - name: metrics-reader
          namespace: apps
          audience: metrics-api
```

Create these namespaces and service accounts separately before the Helm upgrade. The chart creates scoped Roles/RoleBindings and audience mappings, not the service accounts themselves. An entry without `audience` grants RBAC only and is insufficient for minting in enforce mode. Existing users of `allowAllServiceAccountTokenCreation: true` also need exact audience mappings; an approval in `additionalAllowedAudiences` is not enough.

Vault's `credential.serviceAccountName` selects a service account in the referencing ScaledObject/ScaledJob namespace. Generic BSAT in a TA uses the TA namespace; in a CTA it uses `KEDA_CLUSTER_OBJECT_NAMESPACE`, defaulting to the operator's namespace. These namespace rules are unchanged.

`hashiCorpVault.kubernetesAuth.audience` does **not** supply a minting default. Each TokenRequest uses its exact service-account mapping. Audience selection is operator configuration, not a TA/CTA setting.

A TokenReview-based receiver must request the dedicated audience, verify it in the response, and use its own API credential for the review. For a Prometheus, Loki, or metrics-api endpoint behind kube-rbac-proxy, configure its `--auth-token-audiences` with the matching audience and retain authorization checks.

**Datadog Cluster Agent 7.83.2 does not expose this audience configuration in its external-metrics server.** Adding only a dedicated non-API audience mapping will not make that BSAT path work. Use Datadog REST API/app-key authentication or obtain receiver support. Alternatively, [Datadog Audience Compatibility](../scalers/datadog/#datadog-audience-compatibility) uses a metrics-only service account and an API-audience mapping while retaining enforcement; review its security caveat before choosing this option. A REST migration also changes the query configuration and API usage; test it rather than only switching `useClusterAgentProxy`. See [BSAT receiver requirements](../authentication-providers/bound-service-account-token/#receiver-requirements) for the implementation references and guidance for other versions.

### Temporary legacy compatibility

For existing integrations that cannot migrate immediately:

```yaml
operator:
  serviceAccountTokens:
    mode: legacy
    additionalAllowedAudiences: []
hashiCorpVault:
  kubernetesAuth:
    audience: ""
```

This is an **operator-wide, insecure escape hatch** for both Vault and BSAT, not a per-scaler exception. It restores the old implicit Vault API-token path and token minting without an explicit audience. KEDA logs warnings at startup, on legacy Vault logins, and on legacy token minting. It does not disable an independently configured outbound filter.

Remove every minting `audience` field from `serviceAccountTokenCreationRoles` while retaining the names, namespaces, and required RBAC. Also remove any raw `KEDA_SERVICE_ACCOUNT_TOKEN_AUDIENCES` entry. Legacy mode combined with configured audience entries is rejected. Keep externally managed mounts needed by existing TAs. An empty `hashiCorpVault.kubernetesAuth: {}` does not select legacy mode or reliably clear Helm's merged values.

Legacy mode leaves the installation vulnerable to forwarding API-valid tokens to tenant-controlled endpoints. Use it only as a temporary compatibility measure while migrating the affected integrations.

### Upgrade verification and rollback

Inspect the rendered operator arguments, environment, and volumes before applying the upgrade. With `--reuse-values`, explicitly supply both `hashiCorpVault.kubernetesAuth.audience` and `projectedTokenMountPath` if the default projection is needed: older saved values can omit new defaults. Where available, `--reset-then-reuse-values` incorporates chart defaults before existing values and migration overrides. Neither option rewrites TA/CTA resources or receiver configuration.

After upgrading, verify:

- ScaledObject/ScaledJob readiness, failure Events, and operator logs, not just Helm `--wait` or Deployment readiness.
- Successful activation, scaling, and token refresh for each affected integration.
- Rejection of an explicitly selected API-token file and of minting without an audience mapping.
- Absence of unexpected legacy warnings.

The [Vault endpoint filter](../operate/security/#restrict-vault-destinations) remains optional. Start in `warn` to discover destinations, then use `enforce` with reviewed trusted origins. An empty list in enforce mode blocks all Vault authentication.

Rollback must include receiver roles, TA paths, and audience settings as well as Helm. Rolling back to a pre-fix operator restores its forwarding risk. Keep a tested recovery plan, and do not resolve receiver failures by granting broad TokenRequest RBAC or approving an API audience.

### Azure Pipelines in-flight jobs

KEDA 2.21 adds the Azure Pipelines scaler metadata field `scaleOnInFlight`, which defaults to `true`. The reported queue length now includes unfinished jobs that have already been assigned to an agent. Finished jobs remain excluded.

This default avoids subtracting running ScaledJobs twice when using the `default` ScaledJob scaling strategy: assigned Azure Pipelines jobs remain in the scaler metric, and the strategy subtracts the corresponding running Kubernetes Jobs. Review these combinations before upgrading:

- For a ScaledJob using the `default` strategy, retain `scaleOnInFlight: true`.
- To count only unassigned Azure Pipelines jobs, set `scaleOnInFlight: false` and use the `accurate` ScaledJob strategy.
- For a ScaledObject, choose whether its metric should include assigned work and test the resulting replica count. Set `scaleOnInFlight: false` to retain the unassigned-only behavior from KEDA 2.20.

See the [Azure Pipelines scaler documentation](../scalers/azure-pipelines/#trigger-specification) and the [ScaledJob scaling strategy reference](../reference/scaledjob-spec/#scalingstrategy).

### Temporal Rules-Based Versioning settings

KEDA 2.21 removes the deprecated Temporal scaler settings `buildId`, `selectAllActive`, and `selectUnversioned`. A ScaledObject or ScaledJob containing any of these fields now fails scaler metadata parsing.

- For unversioned workers, remove the legacy settings; the scaler uses the unversioned task queue when no Worker Deployment fields are configured.
- For versioned workers, migrate to Temporal Worker Deployment Versioning and configure both `workerDeploymentName` and `workerDeploymentBuildId`. Create separate scaling resources when distinct deployment versions need independent scaling behavior.

See the [Temporal scaler parameters and Worker Deployment Version example](../scalers/temporal/#trigger-specification). Review Temporal's [Worker Deployment documentation](https://docs.temporal.io/production-deployment/worker-deployments) before replacing legacy Rules-Based Versioning configurations.

## Migrating from KEDA v1 to v2

Please note that you **can not** run both KEDA v1 and v2 on the same Kubernetes cluster. You need to [uninstall](../../1.5/deploy) KEDA v1 first, in order to [install](../deploy) and use KEDA v2.

> 💡 **NOTE:** When uninstalling KEDA v1 make sure v1 CRDs are uninstalled from the cluster as well.

KEDA v2 is using a new API namespace for its Custom Resources Definitions (CRD): `keda.sh` instead of `keda.k8s.io` and introduces a new Custom Resource for scaling of Jobs. See full details on KEDA Custom Resources [here](../concepts/#keda-custom-resources-crds).

Here's an overview of what's changed:

- [Scaling of Deployments](#scaling-of-deployments)
- [Scaling of Jobs](#scaling-of-jobs)
- [Improved flexibility & usability of trigger metadata](#improved-flexibility--usability-of-trigger-metadata)
- [Scalers](#scalers)
- [TriggerAuthentication](#triggerauthentication)

### Scaling of Deployments

In order to scale `Deployments` with KEDA v2, you need to do only a few modifications to existing v1 `ScaledObjects` definitions, so they comply with v2:

- Change the value of `apiVersion` property from `keda.k8s.io/v1alpha1` to `keda.sh/v1alpha1`
- Rename property `spec.scaleTargetRef.deploymentName` to `spec.scaleTargetRef.name`
- Rename property `spec.scaleTargetRef.containerName` to `spec.scaleTargetRef.envSourceContainerName`
- Label `deploymentName` (in `metadata.labels.`) is no longer needed to be specified on v2 ScaledObject (it was mandatory on older versions of v1)

Please see the examples below or refer to the full [v2 ScaledObject Specification](./reference/scaledobject-spec)

**Example of v1 ScaledObject**

```yaml
apiVersion: keda.k8s.io/v1alpha1
kind: ScaledObject
metadata:
  name: { scaled-object-name }
  labels:
    deploymentName: { deployment-name }
spec:
  scaleTargetRef:
    deploymentName: { deployment-name }
    containerName: { container-name }
  pollingInterval: 30
  cooldownPeriod: 300
  minReplicaCount: 0
  maxReplicaCount: 100
  triggers:
  # {list of triggers to activate the deployment}
```

**Example of v2 ScaledObject**

```yaml
apiVersion: keda.sh/v1alpha1 #  <--- Property value was changed
kind: ScaledObject
metadata: #  <--- labels.deploymentName is not needed
  name: { scaled-object-name }
spec:
  scaleTargetRef:
    name: { deployment-name } #  <--- Property name was changed
    envSourceContainerName: { container-name } #  <--- Property name was changed
  pollingInterval: 30
  cooldownPeriod: 300
  minReplicaCount: 0
  maxReplicaCount: 100
  triggers:
  # {list of triggers to activate the deployment}
```

### Scaling of Jobs

In order to scale `Jobs` with KEDA v2, you need to do only a few modifications to existing v1 `ScaledObjects` definitions, so they comply with v2:

- Change the value of `apiVersion` property from `keda.k8s.io/v1alpha1` to `keda.sh/v1alpha1`
- Change the value of `kind` property from `ScaledObject` to `ScaledJob`
- Remove property `spec.scaleType`
- Remove properties `spec.cooldownPeriod` and `spec.minReplicaCount`

You can configure `successfulJobsHistoryLimit` and `failedJobsHistoryLimit`. They will remove the old job histories automatically.

Please see the examples below or refer to the full [v2 ScaledJob Specification](./reference/scaledjob-spec/)

**Example of v1 ScaledObject for Jobs scaling**

```yaml
apiVersion: keda.k8s.io/v1alpha1
kind: ScaledObject
metadata:
  name: { scaled-object-name }
spec:
  scaleType: job
  jobTargetRef:
    parallelism: 1
    completions: 1
    activeDeadlineSeconds: 600
    backoffLimit: 6
    template:
      # {job template}
  pollingInterval: 30
  cooldownPeriod: 300
  minReplicaCount: 0
  maxReplicaCount: 100
  triggers:
  # {list of triggers to create jobs}
```

**Example of v2 ScaledJob**

```yaml
apiVersion: keda.sh/v1alpha1 #  <--- Property value was changed
kind: ScaledJob #  <--- Property value was changed
metadata:
  name: { scaled-job-name }
spec: #  <--- spec.scaleType is not needed
  jobTargetRef:
    parallelism: 1
    completions: 1
    activeDeadlineSeconds: 600
    backoffLimit: 6
    template:
      # {job template}
  pollingInterval: 30 #  <--- spec.cooldownPeriod and spec.minReplicaCount are not needed
  successfulJobsHistoryLimit: 5 #  <--- property is added
  failedJobsHistoryLimit: 5 #  <--- Property is added
  maxReplicaCount: 100
  triggers:
  # {list of triggers to create jobs}
```

### Improved flexibility & usability of trigger metadata

We've introduced more options to configure trigger metadata to give users more flexibility.

> 💡 **NOTE:** Changes only apply to trigger metadata and don't impact usage of `TriggerAuthentication`

Here's an overview:

| Scaler               | 1.x                                                                                                             | 2.0                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------- |
| `azure-blob`         | `connection` (**Default**: `AzureWebJobsStorage`)                                                               | `connectionFromEnv`                                                                               |
| `azure-monitor`      | `activeDirectoryClientId` `activeDirectoryClientPassword`                                                       | `activeDirectoryClientId` `activeDirectoryClientIdFromEnv` `activeDirectoryClientPasswordFromEnv` |
| `azure-queue`        | `connection` (**Default**: AzureWebJobsStorage)                                                                 | `connectionFromEnv`                                                                               |
| `azure-servicebus`   | `connection`                                                                                                    | `connectionFromEnv`                                                                               |
| `azure-eventhub`     | `storageConnection` (**Default**: `AzureWebJobsStorage`) `connection` (**Default**: `EventHub`)                 | `storageConnectionFromEnv` `connectionFromEnv`                                                    |
| `aws-cloudwatch`     | `awsAccessKeyID` (**Default**: `AWS_ACCESS_KEY_ID`) `awsSecretAccessKey` (**Default**: `AWS_SECRET_ACCESS_KEY`) | `awsAccessKeyID` `awsAccessKeyIDFromEnv` `awsSecretAccessKeyFromEnv`                              |
| `aws-kinesis-stream` | `awsAccessKeyID` (**Default**: `AWS_ACCESS_KEY_ID`) `awsSecretAccessKey` (**Default**: `AWS_SECRET_ACCESS_KEY`) | `awsAccessKeyID` `awsAccessKeyIDFromEnv` `awsSecretAccessKeyFromEnv`                              |
| `aws-sqs-queue`      | `awsAccessKeyID` (**Default**: `AWS_ACCESS_KEY_ID`) `awsSecretAccessKey` (**Default**: `AWS_SECRET_ACCESS_KEY`) | `awsAccessKeyID` `awsAccessKeyIDFromEnv` `awsSecretAccessKeyFromEnv`                              |
| `kafka`              | _(none)_                                                                                                        | _(none)_                                                                                          |
| `rabbitmq`           | `apiHost` `host`                                                                                                | ~~`apiHost`~~ `host` `hostFromEnv`                                                                |
| `prometheus`         | _(none)_                                                                                                        | _(none)_                                                                                          |
| `cron`               | _(none)_                                                                                                        | _(none)_                                                                                          |
| `redis`              | `address` `host` `port` `password`                                                                              | `address` `addressFromEnv` `host` `hostFromEnv` ~~`port`~~ `passwordFromEnv`                      |
| `redis-streams`      | `address` `host` `port` `password`                                                                              | `address` `addressFromEnv` `host` `hostFromEnv` ~~`port`~~ `passwordFromEnv`                      |
| `gcp-pubsub`         | `credentials`                                                                                                   | `credentialsFromEnv`                                                                              |
| `external`           | _(any matching value)_                                                                                          | _(any matching value with `FromEnv` suffix)_                                                      |
| `liiklus`            | _(none)_                                                                                                        | _(none)_                                                                                          |
| `stan`               | _(none)_                                                                                                        | _(none)_                                                                                          |
| `huawei-cloudeye`    |                                                                                                                 | _(none)_                                                                                          | _(none)_ |
| `postgresql`         | `connection` `password`                                                                                         | `connectionFromEnv` `passwordFromEnv`                                                             |
| `mysql`              | `connectionString` `password`                                                                                   | `connectionStringFromEnv` `passwordFromEnv`                                                       |

### Scalers

**Azure Service Bus**

- `queueLength` was renamed to `messageCount`

**Kafka**

- `authMode` property was replaced with `sasl` and `tls` properties. Please refer [documentation](../scalers/apache-kafka/#authentication-parameters) for Kafka Authentication Parameters details.

**RabbitMQ**

In KEDA 2.0 the RabbitMQ scaler has only `host` parameter, and the protocol for communication can be specified by
`protocol` (http or amqp). The default value is `amqp`. The behavior changes only for scalers that were using HTTP
protocol.

Example of RabbitMQ trigger before 2.0:

```yaml
triggers:
  - type: rabbitmq
    metadata:
      queueLength: "20"
      queueName: testqueue
      includeUnacked: "true"
      apiHost: "https://guest:password@localhost:443/vhostname"
```

The same trigger in 2.0:

```yaml
triggers:
  - type: rabbitmq
    metadata:
      queueLength: "20"
      queueName: testqueue
      protocol: "http"
      host: "https://guest:password@localhost:443/vhostname"
```

### TriggerAuthentication

In order to use Authentication via `TriggerAuthentication` with KEDA v2, you need to change:

- Change the value of `apiVersion` property from `keda.k8s.io/v1alpha1` to `keda.sh/v1alpha1`

For more details please refer to the full
[v2 TriggerAuthentication Specification](../concepts/authentication/#re-use-credentials-and-delegate-auth-with-triggerauthentication)
