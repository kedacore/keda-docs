+++
title = "GitLab Runner Scaler"
availability = "v2.20+"
maintainer = "Community"
category = "CI/CD"
description = "Scale GitLab Runners based on the number of pending jobs in GitLab CI/CD"
go_file = "gitlab_runner_scaler"
+++

### Trigger Specification

This specification describes the `gitlab-runner` trigger that scales based on the number of pending jobs in GitLab CI/CD pipelines for a project or group.

```yaml
triggers:
  - type: gitlab-runner
    metadata:
      # Optional: The URL of the GitLab API, defaults to https://gitlab.com
      gitlabAPIURL: "https://gitlab.com"
      # Required (mutually exclusive with groupID): The GitLab project ID to monitor
      projectID: "{projectID}"
      # Required (mutually exclusive with projectID): The GitLab group ID to monitor
      groupID: "{groupID}"
      # Optional: Comma-separated job scopes to query (e.g. "pending", "pending,created")
      jobScopes: "pending"
      # Optional: The target number of queued jobs per replica
      targetQueueLength: "1"
      # Optional: Threshold for activating the scaler from zero
      activationTargetQueueLength: "0"
      # Optional: Include subgroup projects when using groupID. Defaults to "true"
      includeSubgroups: "true"
      # Optional: Comma-separated list of runner tags to filter jobs by
      tagList: "{tagList}"
      # Optional: Whether the runner can pick up untagged jobs. Defaults to "false"
      runUntagged: "false"
      # Optional: Skip TLS certificate verification. Defaults to "false"
      unsafeSsl: "false"
    authenticationRef:
      name: gitlab-trigger-auth
```

**Parameter list:**

- `gitlabAPIURL` - The URL of the GitLab instance API. Only modify this for self-managed GitLab instances. (Default: `https://gitlab.com`, Optional)
- `projectID` - The GitLab project ID to monitor for pending jobs. (Required if `groupID` is not set, mutually exclusive with `groupID`)
- `groupID` - The GitLab group ID to monitor. When set, the scaler queries all projects in the group (and subgroups by default). (Required if `projectID` is not set, mutually exclusive with `projectID`)
- `jobScopes` - Comma-separated list of job scopes to count. Common values: `pending`, `created`, `running`. See the [GitLab Jobs API](https://docs.gitlab.com/api/jobs/#list-project-jobs) for all valid scopes. (Default: `pending`, Optional)
- `targetQueueLength` - The target number of queued jobs per replica used by the HPA for 1-to-N scaling. (Default: `1`, Optional)
- `activationTargetQueueLength` - The minimum number of queued jobs required to activate the scaler from zero. The scaler activates when the queue length is strictly greater than this value. (Default: `0`, Optional)
- `includeSubgroups` - Whether to include projects from subgroups when using `groupID`. (Values: `true`, `false`, Default: `true`, Optional)
- `tagList` - Comma-separated list of runner tags. When set, only jobs whose tags are all present in this list are counted. See [Tag filtering](#tag-filtering) below. (Optional)
- `runUntagged` - Whether the runner can pick up jobs with no tags. When set to `true` without `tagList`, only untagged jobs are counted. When combined with `tagList`, both untagged jobs and tag-matching jobs are counted. (Values: `true`, `false`, Default: `false`, Optional)
- `unsafeSsl` - Skip TLS certificate verification when connecting to the GitLab API. Useful for self-managed instances with self-signed certificates. (Values: `true`, `false`, Default: `false`, Optional)

*Parameters from Environment Variables*

You can access each parameter from above using environment variables. When you specify the parameter in metadata with a suffix of `FromEnv`,
the scaler will use the value from the environment variable. The environment variable must be available to the manifest. e.g. `projectIDFromEnv: "GITLAB_PROJECT_ID"` will use the environment variable `GITLAB_PROJECT_ID` as the source for the `projectID` parameter.

- `gitlabAPIURLFromEnv` - The URL of the GitLab instance API. (Default: `https://gitlab.com`, Optional)
- `projectIDFromEnv` - The GitLab project ID to monitor for pending jobs. (Required if `groupID` is not set)
- `groupIDFromEnv` - The GitLab group ID to monitor. (Required if `projectID` is not set)
- `jobScopesFromEnv` - Comma-separated list of job scopes to count. (Default: `pending`, Optional)
- `targetQueueLengthFromEnv` - The target number of queued jobs per replica. (Default: `1`, Optional)
- `includeSubgroupsFromEnv` - Whether to include projects from subgroups when using `groupID`. (Default: `true`, Optional)
- `tagListFromEnv` - Comma-separated list of runner tags to filter jobs by. (Optional)
- `runUntaggedFromEnv` - Whether the runner can pick up jobs with no tags. (Default: `false`, Optional)

### Authentication Parameters

You authenticate with GitLab using a Personal Access Token or a Project/Group Access Token via `TriggerAuthentication` configuration.

**Token Authentication:**

- `personalAccessToken` - A GitLab access token with the `read_api` scope and at least **Reporter** role. Reporter is the minimum role that can reliably view jobs across all project visibility types (private, internal, and public). This can be a [Personal Access Token](https://docs.gitlab.com/user/profile/personal_access_tokens/), [Project Access Token](https://docs.gitlab.com/user/project/settings/project_access_tokens/), or [Group Access Token](https://docs.gitlab.com/user/group/settings/group_access_tokens/). When using `groupID`, the token must have access to the group (a Project Access Token scoped to a single project will not work for group-level queries). (Required)

### How does it work?

The scaler queries the GitLab API to count jobs in the configured scope:

- **Project scope** (`projectID`): Queries the [project jobs API](https://docs.gitlab.com/api/jobs/#list-project-jobs) directly.
- **Group scope** (`groupID`): First fetches all projects in the group (and subgroups if `includeSubgroups` is `true`), then queries each project's jobs.

#### Tag filtering

When `tagList` or `runUntagged` is configured, the scaler checks each job's tags to see if the runner could pick it up:

- A **tagged job** is counted only if every tag on the job is present in the runner's `tagList` (comparison is case-insensitive). For example, a job tagged `docker,linux` matches a runner with `tagList: "docker,linux,gpu"` but not a runner with `tagList: "docker"`.
- An **untagged job** (no tags) is counted only if `runUntagged` is `true`.
- If neither `tagList` nor `runUntagged` is set, all jobs in the configured scope are counted regardless of tags.

This mirrors GitLab's own [runner tag matching behavior](https://docs.gitlab.com/ci/runners/configure_runners/#use-tags-to-control-which-jobs-a-runner-can-run).

When no tag filtering is configured, the scaler uses the `x-total` response header from the GitLab API to get the job count in a single request per project without parsing the response body. When tag filtering is enabled, the scaler pages through all jobs in the scope to check their tags (one request per 100 jobs).

**Scaling behavior**

- The scaler **activates** (scales from zero to one) when the queue length is strictly greater than `activationTargetQueueLength`.
- Once active, the HPA scales replicas based on `targetQueueLength` (e.g., 10 pending jobs with `targetQueueLength: 2` targets 5 replicas).

**Notes on Rate Limits**

GitLab applies rate limits to API requests. The exact limits depend on your GitLab tier and instance configuration ([GitLab rate limits documentation](https://docs.gitlab.com/security/rate_limits/)).

**API call volume per polling cycle:**

- **Project scope without tag filtering**: 1 request per configured scope (typically just 1).
- **Project scope with tag filtering**: 1+ requests per scope, depending on the total number of jobs in the scope (100 jobs per page).
- **Group scope**: 1+ requests to list projects, then the above per project.

To minimize API usage:
- Use `projectID` instead of `groupID` when possible.
- Avoid querying multiple scopes unless necessary.
- Adjust `pollingInterval` on the ScaledObject/ScaledJob to balance responsiveness against rate limit consumption.

Note: Self-managed GitLab instances may have different or no rate limits depending on configuration.

### Example

Using a Personal Access Token with a project-scoped ScaledObject:

```yaml
apiVersion: v1
kind: Secret
type: Opaque
metadata:
  name: gitlab-auth
data:
  personalAccessToken: <base64-encoded token>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: gitlab-trigger-auth
  namespace: default
spec:
  secretTargetRef:
    - parameter: personalAccessToken
      name: gitlab-auth
      key: personalAccessToken
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: gitlab-runner-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: gitlab-runner-deployment
  minReplicaCount: 1
  maxReplicaCount: 10
  triggers:
  - type: gitlab-runner
    metadata:
      projectID: "12345"
      targetQueueLength: "1"
    authenticationRef:
      name: gitlab-trigger-auth
```

Group-scoped ScaledJob with tag filtering:

```yaml
apiVersion: v1
kind: Secret
type: Opaque
metadata:
  name: gitlab-auth
  namespace: gitlab-runners
data:
  personalAccessToken: <base64-encoded token>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: gitlab-trigger-auth
  namespace: gitlab-runners
spec:
  secretTargetRef:
    - parameter: personalAccessToken
      name: gitlab-auth
      key: personalAccessToken
---
apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata:
  name: gitlab-runner-scaledjob
  namespace: gitlab-runners
spec:
  jobTargetRef:
    template:
      metadata:
        labels:
          app: gitlab-runner
      spec:
        containers:
        - name: gitlab-runner
          image: gitlab/gitlab-runner:latest
          args: ["run", "--max-builds", "1"]
        restartPolicy: Never
  minReplicaCount: 0
  maxReplicaCount: 20
  pollingInterval: 30
  triggers:
  - type: gitlab-runner
    metadata:
      groupID: "67890"
      includeSubgroups: "true"
      tagList: "docker,linux"
      runUntagged: "false"
      targetQueueLength: "1"
      activationTargetQueueLength: "0"
    authenticationRef:
      name: gitlab-trigger-auth
```

Self-managed GitLab instance using environment variables (reusing the `TriggerAuthentication` from the first example):

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: gitlab-runner-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: gitlab-runner-deployment
  minReplicaCount: 0
  maxReplicaCount: 10
  triggers:
  - type: gitlab-runner
    metadata:
      gitlabAPIURL: "https://gitlab.example.com"
      unsafeSsl: "true"
      projectIDFromEnv: "GITLAB_PROJECT_ID"
      tagListFromEnv: "RUNNER_TAGS"
      targetQueueLength: "1"
      activationTargetQueueLength: "0"
    authenticationRef:
      name: gitlab-trigger-auth
```
