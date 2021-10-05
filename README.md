# KEDA - Docs

Documentation and landing page for the KEDA project at https://keda.sh.

## Become a listed KEDA user!

Are you using KEDA in production? Do you want to become a [listed user](https://keda.sh/community/#users)? Say no more!

You can easily get listed by following these steps:
1. Upload your logo to `static/img/logos/` _(350x180)_
2. Configure your company as a new user in `config.toml` _(sorted alphabetically)_

```toml
[[params.users]]
url = "https://coralogix.com/"
logo = "coralogix.gif"
```

Here's a good example of [Coralogix becoming a listed user](https://github.com/kedacore/keda-docs/pull/182)!

## Running the site locally

To run local site previews, you must install [Hugo](https://gohugo.io/getting-started/installing/) (the "extended" version with [Hugo Pipes](https://gohugo.io/hugo-pipes/introduction/) support) and [Yarn](https://classic.yarnpkg.com/en/docs/install/#mac-stable).

### Installing Hugo and Yarn on Linux

1. Install [Go](https://golang.org/doc/install), [node and npm](https://docs.npmjs.com/cli/v7/configuring-npm/install)
1. Install Yarn:

    ```sh
    npm install --global yarn
    ```

1. Install Hugo:

    ```sh
    cd %HOME/src
    git clone https://github.com/gohugoio/hugo.git
    cd hugo
    go install --tags extended
    ```

### Installing Hugo and Yarn on Windows by using `choco`

1. Install Hugo:

    ```sh
    choco install hugo-extended
    ```

1. Install Yarn:

    ```sh
    choco install yarn
    ```

### Installing Hugo and Yarn on Mac by using `brew`

1. Install Hugo:

    ```sh
    brew install hugo
    ```

1. Install Yarn:

    ```sh
    brew install yarn
    ```

### Run the site locally

1. Fork the `keda-docs` repository.

1. Clone the fork.

1. Navigate to your cloned repository and run the commands:

    ```sh
    yarn
    ```

    ```sh
    hugo server -D -F
    ```

    The Web Server is available at http://localhost:1313/.

## Publishing the site

The KEDA website is published automatically by [Netlify](https://netlify.com). Any time changes to this repo are pushed to `master`, the site is re-built and re-published in roughly two minutes.

## Adding blog posts

To add a new post to the [KEDA blog](https://keda.sh/blog):

```sh
hugo new blog/my-new-post.md
```

This creates a boilerplate Markdown file in `content/blog/my-new-post.md` whose contents you can modify. The following fields are required:

* `title`
* `date` (in `YYYY-MM-DD` format)
* `author`

## Adding scaler documentation

To add documentation for a new KEDA [scaler](https://keda.sh/docs/scalers):

```sh
hugo new --kind scaler scalers/<VERSION>/my-new-scaler.md
```

This creates a boilerplate Markdown file in `content/docs/scalers/my-new-scaler.md` whose contents you can modify. Make sure to update the following metadata fields:

* `title`
* `availability`
* `maintainer`
* `description`

## Writing documentation for a scaler

In order to maintain the style consistency across different scalers, all the parameters which are listed have to be written using this convention:

- name - Description. (Values: x, y, z, Default: y, Optional, Extra Info)

If a parameter is required or doesn't have defined/default values, the missing info should be removed from the pattern.

Some examples of this convention could be:

- `targetMetricValue` - Target value for your metric.
- `metricFilter` - Aggregation method of the metric. (Values: `max`, `min`, `average`, `sum`, `variance`, Default: `average`, Optional)
- `metricPeriod` - Granularity of the metric. (Default: `300`, Optional)
- `subscriptionName` - Name of the Azure Service Bus queue to scale on. (Optional, Required when `topicName` is specified)


## Add new Frequently Asked Question (FAQ)

To update the KEDA [FAQ page](https://keda.sh/docs/faq), update the TOML file at [`data/faq20.toml`]. Here's an example question/answer pair:

```toml
[[qna]]
q = "How can I add a new question/answer pair?"
a = "You're looking at it! 😀"
```

## Add new troubleshooting guidance

To add a new section to the [troubleshooting page](https://keda.sh/docs/troubleshooting):

```sh
hugo new troubleshooting/<VERSION>/my-new-issue.md
```

To adjust the order in which the troubleshooting tiles appear, use the `weight` parameter in each page's metadata.

## Working with documentation versions

The KEDA documentation is versioned. Each version has its own subdirectory under [`content/docs`](./content/docs). To add a new version, copy the directory for the most recent version. Here's an example:

```sh
cp -rf content/docs/<CurrentVersion> content/docs/<NewVersion>
```

By default, new documentation versions are not listed as available version so it's safe to make changes to them. After every release, the version will be published as new version.

### Publishing a new version

Once a version is ready to be published, we must add the version to the `params.versions.docs` list in [`config.toml`](./config.toml).

More recent versions should be placed first in the list (ordering *does* matter because the first element in that list is considered the latest version).
