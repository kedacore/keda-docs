+++
title = "Github Runner Scaler"
availability = "v2.10+"
maintainer = "GitHub"
category = "CI/CD"
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
      githubApiURL: "https://api.github.com"
      # Required: The owner of the GitHub repository, or the organization that owns the repository
      owner: "{owner}"
      # Required: The scope of the runner, can be either "org" (organisation), "ent" (enterprise) or "repo" (repository)
      runnerScope: "{runnerScope}"
      # Optional: The list of repositories to scale, separated by comma
      repos: "{repos}"
      # Optional: The list of runner labels to scale on, separated by comma
      labels: "{labels}"
      # Optional: Not scale on default runner labels ("self-hosted", "linux", "x64"), can be either "true" or "false", defaults to "false" (scale on default runner labels)
      noDefaultLabels: "{noDefaultLabels}"
      # Optional: The target number of queued jobs to scale on
      targetWorkflowQueueLength: "1" # Default 1
      # Optional: The name of the application ID from the GitHub App
      applicationID: "{applicatonID}"
      # Optional: The name of the installation ID from the GitHub App once installed into Org or repo.
      installationID: "{installationID}"      
    authenticationRef:
      name: personalAccessToken or appKey triggerAuthentication Reference
```

**Parameter list:**

- `githubApiURL` - The URL of the GitHub API, defaults to https://api.github.com. You should only need to modify this if you have your own GitHub Appliance. (Optional)
- `owner` - The owner of the GitHub repository, or the organization that owns the repository. (Required)
- `runnerScope` - The scope of the runner, can be either "org", "ent" or "repo". (Required)
- `repos` - The list of repositories to scale, separated by comma. (Optional)
- `labels` - The list of runner labels to scale on, separated by comma. (Optional)
- `noDefaultLabels` - Not scale on default runner labels ("self-hosted", "linux", "x64"). (Values: `true`,`false`, Default: "false", Optional)
- `targetWorkflowQueueLength` - The target number of queued jobs to scale on. (Optional, Default: 1)
- `applicationID` - The name of the application ID from the GitHub App. (Optional, Required if installationID set)
- `installationID` - The name of the installation ID from the GitHub App once installed into Org or repo. (Optional, Required if applicationID set)

*Parameters from Environment Variables*

You can access each parameter from above using environment variables. When you specify the parameter in metadata with a suffix of `FromEnv`, 
the scaler will use the value from the environment variable. The environment variable must be available to the manifest. e.g. `labelsFromEnv: "RUNNER_LABELS"` will use the environment variable `RUNNER_LABELS` as the source fo the `labels` parameter.

- `githubApiURLFromEnv` - The URL of the GitHub API, defaults to https://api.github.com. You should only need to modify this if you have your own GitHub Appliance. (Optional)
- `ownerFromEnv` - The owner of the GitHub repository, or the organization that owns the repository. (Required)
- `runnerScopeFromEnv` - The scope of the runner, can be either "org", "ent" or "repo". (Required)
- `reposFromEnv` - The list of repositories to scale, separated by comma. (Optional)
- `labelsFromEnv` - The list of runner labels to scale on, separated by comma. (Optional)
- `noDefaultLabelsFromEnv` - Not scale on default runner labels ("self-hosted", "linux", "x64"), can be either "true" or "false". (Optional)
- `targetWorkflowQueueLengthFromEnv` - The target number of queued jobs to scale on. (Optional, Default: 1)
- `applicationIDFromEnv` - The name of the application ID from the GitHub App. (Optional) (Required if installationID set)
- `installationIDFromEnv` - The name of the installation ID from the GitHub App once installed into Org or repo. (Optional) (Required if applicationID set)

### Authentication Parameters

You authenticate with GitHub using a Personal Access Token or a GitHub App private key via `TriggerAuthentication` configuration.

**Token or Key Authentication:**

- `personalAccessToken` - The Personal Access Token (PAT) for GitHub from your user. (Optional, Required if GitHub App not used)
- `appKey` - The private key for the GitHub App. This is the contents of the `.pem` file you downloaded when you created the GitHub App. (Optional, Required if applicationID set)

### Setting up the GitHub App

You can use the GitHub App to authenticate with GitHub. This is useful if you want a more secure method of authentication with higher rate limits.

1. Create a GitHub App in your organization or repository. ([docs](https://docs.github.com/en/developers/apps/creating-a-github-app))
2. Make a note of the Application ID. You will need these to configure the scaler.
3. Disable Webhooks on your GitHub App.
4. Set the permissions for your GitHub App. The following permissions are required:
    - **Repository permissions**
        - Actions - Read-only
        - Administration - Read & Write
        - Metadata - Read-only
    - **Organization permissions**
        - Actions - Read-only
        - Metadata - Read-only
        - Self-hosted Runners - Read & write
5. Download the private key for the GitHub App. ([docs](https://docs.github.com/en/developers/apps/authenticating-with-github-apps#generating-a-private-key))
6. Install the GitHub App on your organization or repository. ([docs](https://docs.github.com/en/developers/apps/installing-github-apps))
7. Make a note of the Installation ID. You will need these to configure the scaler.

### How does it work?

The scaler will query the GitHub API to get the number of queued jobs in the specified repositories, subject to filters. If the number of queued jobs is equal to or greater than the `targetWorkflowQueueLength`,  the scaler will scale up.

We provide various options to have granular control over what runners to scale:
- **Repository Filtering** - If no `repos` are specified, the scaler will query all repositories in the specified `owner`. This is useful if you want to scale on all repositories in an organization, but will result in a lot of API calls and affect the Rate Limit.
- **Label-based Filtering** - The `labels` parameter is used to filter the runners that the scaler will scale. It uses the minimum applicable label for the runner. For example, if you have a runner with the labels `golang` and `helm`, and you specify `helm` in the `labels` field on the GitHub Action, the scaler will scale up that runner. By default the scaler will always scale on default labels (`self-hosted`, `linux`, `x64`) in addition to the ones defined in `labels` parameter, scaling on default labels can be disabled by setting `noDefaultLabels` parameter to `true`.

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

Additional Note: The GitHub App authentication method has a rate limit of 15000 rather than 5000 per hour.

**Fine-Tuning**

The current GitHub API design does not facilitate determining the number of pending jobs efficiently because it requires making many API calls to get an accurate estimate which increases the risk of reaching rate limits. So, there will be a trade off between lower scaler response times and staying within API rate limits. However, users have the flexibility to configure this scaler based on their specific uses cases by changing certain parameters.

For example, the scaler response time and bandwidth can be fine-tuned by adjusting the `pollingInterval` parameter. In theory, setting `pollingInterval` to `1` second, could result in starting up to 600,000 (100 runs x 100 jobs x 60 seconds) runners per minute for each repository (assuming eligible pending jobs are found). However, having so many pending jobs and setting `pollingInterval` to `1` results in at least 6,000 calls (100 runs * 60 seconds), reaching the API rate limit very quickly.

*Older versions of this scaler can fetch only 30 workflow runs and 30 jobs per run during each polling cycle. More details available on this [thread](https://github.com/kedacore/keda/pull/6519).*

At the moment, there's no elegant way to overcome this limit for this particular scaler, unless GitHub introduces a new API or enhances existing ones to allow fetching pending jobs filtered by labels and status in a single call.

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
      githubApiURL: "https://api.github.com"
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
GitHub App example using ScaledJobs and using myoung34's work on containerised runners:
```yaml
apiVersion: v1
kind: Secret
type: Opaque
metadata:
  name: github-auth
data:
  appKey: <encoded PEM certificate from GitHub App>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: github-trigger-auth
  namespace: default
spec:
  secretTargetRef:
    - parameter: appKey
      name: github-auth
      key: appKey
---
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
      applicationID: "1234"
      installationID: "5678"
    authenticationRef:
     name: github-trigger-auth
```
