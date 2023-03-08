+++
title = "Github Runner Scaler"
availability = "v2.10+"
maintainer = "GitHub"
description = "Scale GitHub Runners based on the number of queued jobs in GitHub Actions"
go_file = "github_runner_scaler"
+++

### Trigger Specification

This specification describes the `github-runner-scaler` trigger that scales based on queued jobs in GitHub Actions.

```yaml
triggers:
  - type: github-runner
    metadata:
      # Optional: The URL of the GitHub API, defaults to https://api.github.com
      githubAPIURL: "https://api.github.com"
      # Required: The owner of the GitHub repository, or the organization that owns the repository
      owner: "{owner}"
      # Required: The scope of the runner, can be either "org" (organisation), "ent" (enterprise) or "repo" (repository)
      runnerScope: "{runnerScope}"
      # Optional: The list of repositories to scale, separated by comma
      repos: "{repos}"
      # Optional: The list of runner labels to scale on, separated by comma
      labels: "{labels}"
      # Optional: The target number of queued jobs to scale on
      targetWorkflowQueueLength: "1" # Default 1
    authenticationRef:
      name: personalAccessToken
```

**Parameter list:**

- `githubAPIURL` - The URL of the GitHub API, defaults to https://api.github.com. You should only need to modify this if you have your own GitHub Appliance. (Optional)
- `owner` - The owner of the GitHub repository, or the organization that owns the repository. (Required)
- `runnerScope` - The scope of the runner, can be either "org", "ent" or "repo". (Required)
- `repos` - The list of repositories to scale, separated by comma. (Optional)
- `labels` - The list of runner labels to scale on, separated by comma. (Optional)
- `targetWorkflowQueueLength` - The target number of queued jobs to scale on. (Optional, Default: 1)

*Parameters from Environment Variables*

You can access each parameter from above using environment variables. When you specify the parameter in metadata with a suffix of `FromEnv`, 
the scaler will use the value from the environment variable. The environment variable must be available to the manifest. e.g. `labelsFromEnv: "RUNNER_LABELS"` will use the environment variable `RUNNER_LABELS` as the source fo the `labels` parameter.

- `githubAPIURLFromEnv` - The URL of the GitHub API, defaults to https://api.github.com. You should only need to modify this if you have your own GitHub Appliance. (Optional)
- `ownerFromEnv` - The owner of the GitHub repository, or the organization that owns the repository. (Required)
- `runnerScopeFromEnv` - The scope of the runner, can be either "org", "ent" or "repo". (Required)
- `reposFromEnv` - The list of repositories to scale, separated by comma. (Optional)
- `labelsFromEnv` - The list of runner labels to scale on, separated by comma. (Optional)
- `targetWorkflowQueueLengthFromEnv` - The target number of queued jobs to scale on. (Optional, Default: 1)


### Authentication Parameters

You authenticate with GitHub using a Personal Access Token via `TriggerAuthentication` configuration.

**Personal Access Token Authentication:**

- `personalAccessToken` - The Personal Access Token (PAT) for GitHub from your user.

### How does it work?

The scaler will query the GitHub API to get the number of queued jobs in the specified repositories, subject to filters. If the number of queued jobs is equal to or greater than the `targetWorkflowQueueLength`,  the scaler will scale up.

We provide various options to have granular control over what runners to scale:
- **Repository Filtering** - If no `repos` are specified, the scaler will query all repositories in the specified `owner`. This is useful if you want to scale on all repositories in an organization, but will result in a lot of API calls and affect the Rate Limit.
- **Label-based Filtering** - The `labels` parameter is used to filter the runners that the scaler will scale. It uses the minimum applicable label for the runner. For example, if you have a runner with the labels `golang` and `helm`, and you specify `helm` in the `labels` field on the GitHub Action, the scaler will scale up that runner.

**API Query Chain**

The scaler will query the GitHub API in the following order:

- If no repos are specified: Get the list of repos for the specified owner.
- For each repo: Get the list of workflows runs in the repo.
- For each queued workflow run: Get the list of jobs in the queued workflow run.
- For each job: if the scaler matches, increment the queue length for that scaler.

**Notes on Rate Limits**

GitHub Documentation on Rate Limiting [https://docs.github.com/en/rest/overview/resources-in-the-rest-api?apiVersion=2022-11-28#rate-limiting](https://docs.github.com/en/rest/overview/resources-in-the-rest-api?apiVersion=2022-11-28#rate-limiting)

Example: The GitHub API has a rate limit of standard 5000 requests per hour. The scaler will make 1 request per repository to get the list of workflows, 
and 1 request per queued workflow to get the list of jobs. If you have 100 repositories, and 10 queued workflows (across all those repos), the scaler will make 110 requests per scaler check (default: 30 secs). This is 3.6% of the hourly rate limit per 30 seconds.

Careful design of how you design your repository request layout can help reduce the number of API calls. Usage of the `repos` parameter is recommended to reduce the number of API calls to the GitHub API.

Note: This does not apply to a hosted appliance as there are no rate limits.

**References**

GitHub's self-hosted runner documentation: [https://docs.github.com/en/actions/hosting-your-own-runners/about-self-hosted-runners](https://docs.github.com/en/actions/hosting-your-own-runners/about-self-hosted-runners)

myoung34's excellent worker on containerised runners: [https://github.com/myoung34/docker-github-actions-runner](https://github.com/myoung34/docker-github-actions-runner)

### Example

```yaml
apiVersion: v1
kind: Secret
type: Opaque
metadata:
  name: github-auth
data:
  personalAccessToken: <encoded personalAccessToken>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: github-trigger-auth
  namespace: default
spec:
  secretTargetRef:
    - parameter: personalAccessToken
      name: github-auth
      key: personalAccessToken
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: github-runner-scaledobject
  namespace: default
spec:
  scaleTargetRef:
    name: gitrunner-deployment
  minReplicaCount: 1
  maxReplicaCount: 5
  triggers:
  - type: github-runner
    metadata:
      githubAPIURL: "https://api.github.com"
      owner: "kedacore"
      runnerScope: "repo"
      repos: "keda,keda-docs"
      labels: "golang,helm"
      targetWorkflowQueueLength: "1"
    authenticationRef:
     name: github-trigger-auth
```
Alternate example using ScaledJobs and using myoung34's work on containerised runners:
```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata:
  name: scaledjob-github-runner
  namespace: github-runner
spec:
  jobTargetRef:
    template:
      metadata:
        labels:
          app: scaledjob-github-runner
      spec:
        containers:
        - name: scaledjob-github-runner
          image: myoung34/github-runner:2.302.1-ubuntu-focal
          imagePullPolicy: Always
          env:
          - name: EPHEMERAL
            value: "true"
          - name: DISABLE_RUNNER_UPDATE
            value: "true"
          - name: REPO_URL
            value: "https://github.com/OWNER/REPONAME"
          - name: RUNNER_SCOPE
            value: "repo"
          - name: LABELS
            value: "my-label"
          - name: ACCESS_TOKEN
            valueFrom:
              secretKeyRef:
                name: {{.SecretName}}
                key: personalAccessToken
        restartPolicy: Never
  minReplicaCount: 0
  maxReplicaCount: 20
  pollingInterval: 30
  triggers:
  - type: github-runner
    metadata:
      owner: OWNER
      repos: REPONAME(S)
      labelsFromEnv: "LABELS"
      runnerScopeFromEnv: "RUNNER_SCOPE"
    authenticationRef:
     name: github-trigger-auth
```
