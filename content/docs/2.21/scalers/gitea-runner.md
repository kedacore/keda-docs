+++
title = "Gitea Runner"
availability = "v2.21+"
maintainer = "Community"
category = "CI/CD"
description = "Scale Gitea Actions runners based on the number of queued and running jobs."
go_file = "gitea_runner_scaler"
+++

### Trigger Specification

This specification describes the `gitea-runner` trigger for Gitea Actions. It scales based on the number of Actions jobs that are queued or already running, optionally filtered to the labels your runners offer.

```yaml
triggers:
  - type: gitea-runner
    metadata:
      # Required: URL of the Gitea instance
      address: "http://gitea-http.gitea.svc.cluster.local:3000"
      # Optional: instance-wide scope (default when no other scope is given)
      global: "true"
      # Optional: organisation scope
      org: "my-org"
      # Optional: repository scope, requires owner
      owner: "my-user"
      repo: "my-repo"
      # Optional: only count jobs your runners can actually take
      labels: "ubuntu-latest,self-hosted"
      # Optional: jobs a single runner replica absorbs
      targetJobs: "1"
```

**Parameter list:**

- `address` - URL of the Gitea instance. (Required)
- `global` - Count jobs across the whole instance. (Values: `true`, `false`, Default: `false`, Optional)
- `org` - Organisation to scope to. (Optional)
- `owner` - Repository owner. (Optional, required when `repo` is set)
- `repo` - Repository to scope to. (Optional, requires `owner`)
- `labels` - Comma-separated runner labels. Only jobs whose requested labels are all offered by the runner are counted. When omitted, every pending job is counted. (Optional)
- `matchUnlabeledJobsWithUnlabeledRunners` - Treat a job with no labels as matching only a trigger that declares no labels. (Values: `true`, `false`, Default: `false`, Optional)
- `targetJobs` - Number of jobs one replica handles. (Default: `1`, Optional)

Scopes are evaluated most-specific first: `owner`+`repo`, then `org`, then `global`, otherwise the token owner's own jobs.

### Authentication Parameters

- `token` - Gitea access token. (Required)

The token scope must match the chosen scope, and this is the most common source of `403` errors:

| Scope | Endpoint | Token scope |
| ----- | -------- | ----------- |
| `global` | `/api/v1/admin/actions/jobs` | `read:admin` |
| `org` | `/api/v1/orgs/{org}/actions/jobs` | `read:organization` |
| `owner`+`repo` | `/api/v1/repos/{owner}/{repo}/actions/jobs` | `read:repository` |
| default | `/api/v1/user/actions/jobs` | `read:user` |

A `read:admin` token does **not** grant access to the `/repos/*` endpoints, and vice versa. Give the token the least scope that covers the level you configured.

### How the metric is calculated

The scaler counts jobs whose status is `queued` **or** `in_progress`.

Counting running work as well as waiting work is deliberate. A metric that counts only queued jobs collapses to zero the instant those jobs are picked up, so the autoscaler would tear down the very replicas doing the work. Gitea accepts both statuses in one request, so this costs nothing extra.

Two paths, which differ in how much they ask of your Gitea:

- **Without `labels`** the scaler reads `total_count` from a single request. Gitea's `total_count` honours the status filter, so one call per polling interval answers the question completely — no pagination.
- **With `labels`** Gitea has no server-side label filter for this endpoint, so the scaler pages through jobs and matches labels client-side. Gitea caps page size at `MAX_RESPONSE_ITEMS` (50 by default). Pagination stops after 20 pages and logs that the count is a lower bound — long before that point the workload is already pinned at `maxReplicaCount`, so the cap cannot change a scaling decision.

If you run a single pool of identical runners, omitting `labels` is both simpler and cheaper.

### Gitea vs Forgejo

Use this scaler for Gitea and the [Forgejo scaler](./forgejo.md) for Forgejo. Despite the shared ancestry the two forges expose different APIs for this: Forgejo added a purpose-built `/api/v1/admin/runners/jobs` endpoint with server-side label filtering, while Gitea exposes GitHub-compatible endpoints that return a `{jobs, total_count}` envelope. The scalers are not interchangeable.

### Example

Gitea Actions runners register themselves and then take work. Running them as a `ScaledJob` with `daemon --once` gives you one ephemeral pod per job, which cannot be terminated mid-build during a scale-down.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gitea-api-token
  namespace: runners
data:
  token: <base64 encoded token>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: gitea-api-token
  namespace: runners
spec:
  secretTargetRef:
    - parameter: token
      name: gitea-api-token
      key: token
---
apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata:
  name: gitea-runner
  namespace: runners
spec:
  jobTargetRef:
    parallelism: 1
    completions: 1
    backoffLimit: 0
    template:
      spec:
        restartPolicy: Never
        containers:
          - name: runner
            image: gitea/runner:3.3.0-dind
            securityContext:
              privileged: true
            command:
              - sh
              - -c
              - |
                dockerd &
                timeout 60 sh -c 'until docker info >/dev/null 2>&1; do sleep 1; done'

                gitea-runner register \
                  --no-interactive \
                  --instance "$GITEA_INSTANCE_URL" \
                  --token "$(cat /secrets/token)" \
                  --name "$(hostname)" \
                  --labels "ubuntu-latest:docker://ghcr.io/catthehacker/ubuntu:act-latest"

                # --once: take exactly one job, then exit.
                exec gitea-runner daemon --once
            env:
              - name: GITEA_INSTANCE_URL
                value: "http://gitea-http.gitea.svc.cluster.local:3000"
            volumeMounts:
              - name: registration-token
                mountPath: /secrets
                readOnly: true
        volumes:
          - name: registration-token
            secret:
              secretName: gitea-runner-token
  minReplicaCount: 0
  maxReplicaCount: 5
  pollingInterval: 30
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 5
  scalingStrategy:
    strategy: accurate
  triggers:
    - type: gitea-runner
      metadata:
        address: "http://gitea-http.gitea.svc.cluster.local:3000"
        global: "true"
        labels: "ubuntu-latest"
      authenticationRef:
        name: gitea-api-token
```

Note the two different tokens: `gitea-api-token` is the **API** token the scaler reads the queue with, while `gitea-runner-token` is the **runner registration** token the runner registers itself with. They are not interchangeable.

Because `/data` is not persisted here, each pod registers as a new runner and Gitea does not reap the old rows. Either persist the registration or prune stale offline registrations periodically via `DELETE /api/v1/admin/actions/runners/{id}`.
