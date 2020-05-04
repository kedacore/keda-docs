# KEDA - Docs

Documentation and landing page for the KEDA project at https://keda.sh.

## Running the site locally

Install [Hugo](https://gohugo.io/getting-started/installing/) (the "extended" version with [Hugo Pipes](https://gohugo.io/hugo-pipes/introduction/) support) and [Yarn](https://classic.yarnpkg.com/en/docs/install/#mac-stable):

### Windows

```sh
choco install hugo-extended
choco install yarn
```

### Mac

```sh
brew install hugo
brew install yarn
```

Now you can run the docs locally:

```sh
yarn

hugo server -D -F
```

## Publishing the site

The KEDA website is published automatically by [Netlify](https://netlify.com). Any time changes to this repo are pushed to `master`, the site is re-built and re-published in roughly two minutes.

## Adding blog posts

To add a new post to the [Keda blog](https://keda.sh/blog):

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
hugo new --kind scaler docs/scalers/my-new-scaler.md
```

This creates a boilerplate Markdown file in `content/docs/scalers/my-new-scaler.md` whose contents you can modify. Make sure to update the following metadata fields:

* `title`
* `availability`
* `maintainer`
* `description`

## Add new Frequently Asked Question (FAQ)

To update the KEDA [FAQ page](https://keda.sh/docs/faq), update the TOML file at [`data/faq.toml`]. Here's an example question/answer pair:

```toml
[[qna]]
q = "How can I add a new question/answer pair?"
a = "You're looking at it! 😀"
```

## Add new troubleshooting guidance

To add a new section to the [troubleshooting page](https://keda.sh/docs/troubleshooting):

```sh
hugo new troubleshooting/my-new-issue.md
```

To adjust the order in which the troubleshooting tiles appear, use the `weight` parameter in each page's metadata.

