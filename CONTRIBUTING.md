# Contributing to KEDA

Thanks for helping make KEDA better 😍.

There are many areas we can use contributions - documenting scalers, adding FAQ, troubleshooting, samples, and more.

Our documentation is versioned so it's important to make the changes for the correct KEDA version.
If you need to introduce a new version, we recommend reading our documentation about it [here](#working-with-documentation-versions).

- [Contributing to KEDA](#contributing-to-keda)
  - [Getting Help](#getting-help)
  - [Local development](#local-development)
  - [Contributing New Documentation](#contributing-new-documentation)
    - [Adding blog post](#adding-blog-post)
    - [Adding scaler documentation](#adding-scaler-documentation)
    - [Writing documentation for a scaler](#writing-documentation-for-a-scaler)
    - [Writing documentation for a new authentication provider](#writing-documentation-for-a-new-authentication-provider)
    - [Add new Frequently Asked Question (FAQ)](#add-new-frequently-asked-question-faq)
    - [Add new troubleshooting guidance](#add-new-troubleshooting-guidance)
  - [Working with documentation versions](#working-with-documentation-versions)
    - [Preparing a new version](#preparing-a-new-version)
    - [Publishing a new version](#publishing-a-new-version)
  - [Developer Certificate of Origin: Signing your work](#developer-certificate-of-origin-signing-your-work)
    - [Every commit needs to be signed](#every-commit-needs-to-be-signed)
    - [I didn't sign my commit, now what?](#i-didnt-sign-my-commit-now-what)
  - [Changing the website](#changing-the-website)
    - [Adding a new filter option](#adding-a-new-filter-option)
  - [Listing KEDA Users and Commercial Offerings](#listing-keda-users-and-commercial-offerings)
    - [Become a listed KEDA user](#become-a-listed-keda-user)
    - [Become a listed KEDA commercial offering](#become-a-listed-keda-commercial-offering)

## Getting Help

If you have a question about KEDA or how best to contribute, the [#KEDA](https://kubernetes.slack.com/archives/CKZJ36A5D) channel on the Kubernetes Slack ([get an invite if you don't have one already](https://slack.k8s.io/)) is a good place to start.
We also have regular [community stand-ups](https://github.com/kedacore/keda#community) to track ongoing work and discuss areas of contribution.
For any issues with the product you can [create an issue](https://github.com/kedacore/keda/issues/new) in this repo.

## Local development

1. Fork and clone this repository.
2. Install [Node](https://nodejs.org/).
   Hugo is bundled via the `hugo-extended` npm package — no separate Hugo install needed.
3. Install dependencies:
   ```console
   npm install
   ```
4. Serve the site locally at [localhost:8888](http://localhost:8888):
   ```console
   npm run serve
   ```
5. To do a one-off build (output goes to `public/`):
   ```console
   npm run build
   ```
6. To check for broken links (runs a build first):
   ```console
   npm run check:links
   ```

## Contributing New Documentation

We provide easy ways to introduce new content:

### Adding blog post

To add a new post to the [KEDA blog](https://keda.sh/blog):

```console
npx hugo new blog/my-new-post.md
```

This creates a boilerplate Markdown file in `content/blog/my-new-post.md` whose
contents you can modify. The following fields are required:

- `title`
- `date` (in `YYYY-MM-DD` format)
- `author`

> Note: Please ensure the file is named correctly, as it will be used as the blog post URL slug. Avoid defining an alias to rename the URL slug, as this goes against our convention.

### Adding scaler documentation

To add documentation for a new KEDA [scaler](https://keda.sh/docs/scalers):

```console
npx hugo new --kind scaler docs/<VERSION>/scalers/my-new-scaler.md
```

This creates a boilerplate Markdown file in
`content/docs/<VERSION>/scalers/my-new-scaler.md` whose contents you can modify.
Make sure to update the following metadata fields:

- `title`
- `availability`
- `maintainer`
- `description`

### Writing documentation for a scaler

In order to maintain the style consistency across different scalers, all the
parameters which are listed have to be written using this convention:

- name - Description. (Values: x, y, z, Default: y, Optional, Extra Info)

If a parameter is required or doesn't have defined/default values, the missing
info should be removed from the pattern.

Here are a few examples:

> - `targetMetricValue` - Target value for your metric.
> - `metricFilter` - Aggregation method of the metric. (Values: `max`, `min`, `average`, `sum`, `variance`, Default: `average`, Optional)
> - `metricPeriod` - Granularity of the metric. (Default: `300`, Optional)
> - `subscriptionName` - Name of the Azure Service Bus queue to scale on. (Optional, Required when `topicName` is specified)

### Writing documentation for a new authentication provider

To add documentation for a new [provider](https://keda.sh/docs/concepts/authentication):

```console
npx hugo new --kind provider docs/<VERSION>/providers/my-new-provider.md
```

This creates a boilerplate Markdown file in
`content/docs/<VERSION>/providers/my-new-provider.md` whose contents you can modify.
Make sure to update the following metadata fields:

- `title`

### Add new Frequently Asked Question (FAQ)

To update the KEDA [FAQ page](https://keda.sh/docs/faq), update the TOML file
referenced by `versionData` in `content/docs/<VERSION>/reference/faq.md`.
Here's an example question/answer pair:

```toml
[[qna]]
q = "How can I add a new question/answer pair?"
a = "You're looking at it! 😀"
```

### Add new troubleshooting guidance

To add a new section to the [troubleshooting page](https://keda.sh/docs/troubleshooting):

```console
npx hugo new troubleshooting/<VERSION>/my-new-issue.md
```

To adjust the order in which the troubleshooting tiles appear, use the `weight`
parameter in each page's metadata.

## Working with documentation versions

The KEDA documentation is versioned. Each version has its own subdirectory under
[content/docs](content/docs). To add a new version, follow these steps:

1. Copy the directory for the most recent version:
   ```console
   cp -rf content/docs/<CurrentVersion> content/docs/<NewVersion>
   ```
2. Copy the file for the most recent faq data in the `data` directory:
   ```console
   cp -rf data/faq<CurrentVersion> data/faq<NewVersion>
   ```
3. Update the `versionData` option in `content/docs/<NewVersion>/reference/faq.md`, replacing `NEW_FAQ_FILE_NAME` with the file name of the faq data for the new version:
   ```text
   {{< faq20 versionData="NEW_FAQ_FILE_NAME" >}}
   ```

By default, new documentation versions are not listed as available version so
it's safe to make changes to them. After every release, the version will be
published as new version.

### Preparing a new version

Remember to create the folder for next version with already existing docs in
current version.

Make sure that the version on `content/docs/{next-version}/deploy.md` is updated
and uses the next version, instead of the current one. Ensure that Kubernetes cluster version is updated as well.

Ensure that compatibility matrix on `content/docs/{next-version}/operate/cluster.md` is updated with the compatibilities for the incoming version.

Update the new version in the `params.unreleased.docs` list in [config.toml](config.toml).

### Publishing a new version

Once a version is ready to be published, we must add the version to the
`params.versions.docs` list in [config.toml](config.toml).

More recent versions should be placed first in the list (ordering _does_ matter
because the first element in that list is considered the latest version).

> Note: Remember to [prepare the next version](#preparing-a-new-version).

## Developer Certificate of Origin: Signing your work

### Every commit needs to be signed

The Developer Certificate of Origin (DCO) is a lightweight way for contributors to certify that they wrote or otherwise have the right to submit the code they are contributing to the project. Here is the full text of the DCO, reformatted for readability:

```text
By making a contribution to this project, I certify that:

    (a) The contribution was created in whole or in part by me and I have the right to submit it under the open source license indicated in the file; or

    (b) The contribution is based upon previous work that, to the best of my knowledge, is covered under an appropriate open source license and I have the right under that license to submit that work with modifications, whether created in whole or in part by me, under the same open source license (unless I am permitted to submit under a different license), as indicated in the file; or

    (c) The contribution was provided directly to me by some other person who certified (a), (b) or (c) and I have not modified it.

    (d) I understand and agree that this project and the contribution are public and that a record of the contribution (including all personal information I submit with it, including my sign-off) is maintained indefinitely and may be redistributed consistent with this project or the open source license(s) involved.
```

Contributors sign-off that they adhere to these requirements by adding a `Signed-off-by` line to commit messages.

```text
This is my commit message

Signed-off-by: Random J Developer <random@developer.example.org>
```

Git even has a `-s` command line option to append this automatically to your commit message:

```console
git commit -s -m 'This is my commit message'
```

Each Pull Request is checked whether or not commits in a Pull Request do contain a valid Signed-off-by line.

### I didn't sign my commit, now what?

No worries - You can easily replay your changes, sign them and force push them!

```console
git checkout <branch-name>
git reset $(git merge-base main <branch-name>)
git add -A
git commit -sm "one commit on <branch-name>"
git push --force
```

## Changing the website

### Adding a new filter option

To add a new filter option, simply follow these steps:

1. Navigate to the doc file you want to annotate.
2. In the frontmatter, add your new filter option:
   ```toml
   FILTER_NAME = "filter_value"
   ```
   Replace `FILTER_NAME` with any desired name of your choice. Same applies to the value.
3. In `layouts/_default/list.lunr.json`, just before the closing parenthesis, append your new option:
   ```text
   "FILTER_NAME" $scalers.Params.FILTER_NAME
   ```
4. In `config.toml`, in the `params.lunr` section, add your new filter option's name to both arrays:
   ```toml
   vars = ["title", "maintainer", "description", "availability", "category", "type", "FILTER_NAME"]
   params = ["availability", "maintainer", "category", "type", "FILTER_NAME"]
   ```
5. In `assets/js/scaler-search.js`, in the `lunr()` callback where `this.field` is called, append your field:
   ```javascript
   this.field("FILTER_NAME", {
     boost: 5,
   });
   ```
   And where `parse[doc.title]` is built, add your field:
   ```javascript
   parse[doc.title] = {
     href: doc.href,
     title: doc.title,
     maintainer: doc.maintainer,
     description: doc.description,
     availability: doc.availability,
     category: doc.category,
     type: doc.type,
     FILTER_NAME: doc.FILTER_NAME,
   };
   ```
6. In `layouts/partials/scaler-layout.html`, locate the div with class `filter-options` and add this new block:
   ```html
   <div class="has-extra-top-margin">
     <h6>FILTER_NAME</h6>
     {{ $FILTER_NAME := slice }} {{ range $scalers := where site.RegularPages
     ".CurrentSection.Title" "Scalers" }} {{ with $scalers.Params.FILTER_NAME }} {{
     $FILTER_NAME = $categories | append ($scalers.Params.FILTER_NAME) }} {{
     $FILTER_NAME = uniq $FILTER_NAME }} {{ end }} {{ end }} {{ range $FILTER_NAME
     }} {{ $item := . }}
     <div>
       <input
         id="{{ . }}"
         type="checkbox"
         name="resource_filter"
         value="FILTER_NAME:{{ . }}"
       />
       <label for="{{ . }}">{{ . }}</label>
     </div>
     {{ end }}
   </div>
   ```
7. Save your changes and rebuild your frontend.

## Listing KEDA Users and Commercial Offerings

### Become a listed KEDA user!

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

### Become a listed KEDA commercial offering!

Do you offer commercial support for KEDA and want to become a [listed commercial offering](https://keda.sh/enterprise)? Say no more!

To be listed as a KEDA commercial offering, organizations must meet the following criteria:

- Demonstrate a commitment to KEDA's maintenance and improvement.
  - On average, have pull requests accepted monthly into KEDA or related projects for features and/or improvements.
  - Have made a substantial contribution to the development of KEDA or related projects.
  - Help triage and comment on issues across the KEDA ecosystem at least 3 times per month.
- Demonstrate an area of expertise in the KEDA ecosystem.
  - Example: Employing one or more KEDA maintainers.
  - Example: Owning a specific high-impact feature or process.
- Participate in KEDA's governance.
  - At least 1 member of the vendor's team attends the community meetings at least 50% of the time.
- Be active KEDA thought leaders.
  - Example: Sponsoring staff for KEDA booths or community events.
  - Example: Giving talks related to KEDA or its ecosystem.
- Provide enterprise-level support and functionality for KEDA or products based directly on it.

If any questions arise regarding eligibility, the KEDA maintainers will make the final decision.

If your organization meets these requirements, you can request to be listed by following these steps:

1. Open a pull request and provide evidence in the PR description showing how the requirements above have been met.
2. Upload your logo to `static/img/logos/` _(350x180)_
3. Configure your company as a new vendor in `config.toml` _(sorted alphabetically)_

```toml
[[params.vendors]]
name = "Red Hat"
logo = "vendors/red-hat.png"
description = """
Red Hat integrates KEDA with OpenShift through the **Custom Metrics Autoscaler** (CMA) available through the OpenShift Marketplace.
"""
urls = [
  { text = "Learn more about the CMA", url = "https://cloud.redhat.com/blog/custom-metrics-autoscaler-on-openshift" }
]
```
