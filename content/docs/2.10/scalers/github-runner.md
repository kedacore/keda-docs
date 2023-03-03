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
      # Required: The scope of the runner, can be either "org", "ent" or "repo"
      runnerScope: "{runnerScope}"
      # Required: The personal access token to access the GitHub API
      personalAccessTokenFromEnv: "{personalAccessToken}"
      # Optional: The list of repositories to scale, separated by comma
      repos: "{repos}"
      # Optional: The list of runner labels to scale on, separated by comma
      labels: "{labels}"
      # Optional: The target number of queued jobs to scale on
      targetWorkflowQueueLength: "1" # Default 1
      # Optional: The target number of queued jobs to achieve to activate the scaler
      activationTargetWorkflowQueueLength: "0" # Default 0
    authenticationRef:
      name: personalAccessToken
```

**Parameter list:**

- `githubAPIURL` - The URL of the GitHub API, defaults to https://api.github.com. You should only need to modify this if you have your own GitHub Appliance. (Optional)
- `owner` - The owner of the GitHub repository, or the organization that owns the repository. (Required)
- `runnerScope` - The scope of the runner, can be either "org", "ent" or "repo". (Required)
- `personalAccessTokenFromEnv` - The personal access token to access the GitHub API. (Required)
- `repos` - The list of repositories to scale, separated by comma. (Optional)
- `labels` - The list of runner labels to scale on, separated by comma. (Optional)
- `targetWorkflowQueueLength` - The target number of queued jobs to scale on. (Optional, Default: 1)
- `activationTargetWorkflowQueueLength` - The target number of queued jobs to achieve to activate the scaler. (Optional, Default: 0)

*Parameters from Environment Variables*

You can access each parameter from above using environment variables. When you specify the parameter in metadata with a suffix of `FromEnv`, 
the scaler will use the value from the environment variable. The environment variable must be available to the manifest. e.g. `labelsFromEnv: "RUNNER_LABELS"` will use the environment variable `RUNNER_LABELS` as the source fo the `labels` parameter.

There are also a set of default environment variables that will be used if none of the above are specified directly.

- `githubAPIURL` - `GITHUB_API_URL`
- `runnerScope` - `RUNNER_SCOPE`
- `personalAccessTokenFromEnv` - `ACCESS_TOKEN`
- `labels` - `LABELS`
- `owner` - No defaults, must be specified if runnerScope is not `org` or `ent`. Otherwise `ORG_NAME` or `ENTERPRISE_NAME` will be used.
- `repos` - No defaults, must be specified or left empty
- `targetWorkflowQueueLength` - No defaults, must be specified or left empty
- `activationTargetWorkflowQueueLength` - No defaults, must be specified or left empty

### Authentication Parameters

As an alternative to using environment variables, you can authenticate with GitHub using a Personal Access Token via `TriggerAuthentication` configuration.

**Personal Access Token Authentication:**

- `personalAccessToken` - The Personal Access Token (PAT) for GitHub from your user.

### How does it work?

The scaler will query the GitHub API to get the number of queued jobs in the specified repositories. If the number of queued jobs is greater than the `targetWorkflowQueueLength`, the scaler will scale up. If the number of queued jobs is less than the `activationTargetWorkflowQueueLength`, the scaler will scale down.

If no `repos` are specified, the scaler will query all repositories in the specified `owner`. This is useful if you want to scale on all repositories in an organization, but will result in a lot of API calls and affect the Rate Limit.

The `labels` parameter is used to filter the runners that the scaler will scale. It uses the minimum applicable label for the runner. For example, if you have a runner with the labels `golang` and `helm`, and you specify `helm` in the `labels` field on the GitHub Action, the scaler will scale up that runner.

**API Query Chain**

The scaler will query the GitHub API in the following order:

If no repos are specified: Get the list of repos for the specified owner.

For each repo: Get the list of workflows runs in the repo.

For each queued workflow run: Get the list of jobs in the queued workflow run.

For each job: if the scaler matches, increment the queue length for that scaler.

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
  name: pipeline-auth
data:
  personalAccessToken: <encoded personalAccessToken>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: pipeline-trigger-auth
  namespace: default
spec:
  secretTargetRef:
    - parameter: personalAccessToken
      name: pipeline-auth
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
      activationTargetWorkflowQueueLength: "0"
    authenticationRef:
     name: pipeline-trigger-auth
```
