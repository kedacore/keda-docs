# KEDA - Docs

Documentation and landing page for the KEDA project at [keda.sh][].

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

## Become a listed KEDA commercial offering!

Do you offer commercial support for KEDA and want to become a [listed commercial offering](https://keda.sh/support/#commercial-support)? Say no more!

You can easily get listed by following these steps:
1. Upload your logo to `static/img/logos/` _(350x180)_
2. Configure your company as a new user in `config.toml` _(sorted alphabetically)_

```toml
[[params.vendors]]
url = "https://cloud.redhat.com/blog/custom-metrics-autoscaler-on-openshift"
logo = "red-hat.png"
```

## Building or serving the site locally

To build or serve the site locally, follow these steps:

- Fork and clone this repository (for local development only).
- Install the latest [LTS release][] of **Node**, using **[nvm][]** for example:
  ```console
  $ nvm install --lts
  ```
  **Note:** on Windows, the argument to install is `lts`.
- Get npm packages and other prerequisites:
  ```console
  $ npm install
  ```
- To build the site, run:
  ```console
  $ npm run build
  ```
  You'll find the generated site files under `public`.
- Serve the site locally at [localhost:8888][] using:
  ```console
  $ npm run serve
  ```

## Contributing

We welcome issues and PRs! For details, see [Contributing to KEDA][].

If you submit a PR, Netlify will automatically create a [deploy preview][] so
that you can view your changes. Once merged, Netlify automatically deploys to
the production site [keda.sh][].

To see deploy logs and more, visit project's [dashboard][] -- Netlify login
required.

### Adding blog posts

To add a new post to the [KEDA blog](https://keda.sh/blog):

```console
$ hugo new blog/my-new-post.md
```

This creates a boilerplate Markdown file in `content/blog/my-new-post.md` whose
contents you can modify. The following fields are required:

* `title`
* `date` (in `YYYY-MM-DD` format)
* `author`

## Adding scaler documentation

To add documentation for a new KEDA [scaler](https://keda.sh/docs/scalers):

```console
$ hugo new --kind scaler docs/<VERSION>/scalers/my-new-scaler.md
```

This creates a boilerplate Markdown file in
`content/docs/<VERSION>/scalers/my-new-scaler.md` whose contents you can modify.
Make sure to update the following metadata fields:

* `title`
* `availability`
* `maintainer`
* `description`

## Writing documentation for a new authentication provider
To add documentation for a new [provider](https://keda.sh/docs/concepts/authentication):

```console
$ hugo new --kind provider docs/<VERSION>/providers/my-new-provider.md
```

This creates a boilerplate Markdown file in
`content/docs/<VERSION>/providers/my-new-provider.md` whose contents you can modify.
Make sure to update the following metadata fields:

* `title`

## Writing documentation for a scaler

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

## Adding a new filter option

To add a new filter option, simply follow these steps:

1. Navigate to the doc file you want to annotate.
2. In the frontmatter, add your new filter option.

```
+++
FILTER_NAME = "filter_value"
+++
```

Replace FILTER_NAME with any desired name of your choice. Same applies to the value.

3. Navigate to the `list.lunr.json` file to edit: `cd layouts/_default/list.lunr.json`.
4. Open the file and go down to line 3. You will notice the format of the data represented in a key/value pair. Just before the closing parenthesis, append your new option like this: `"FILTER_NAME" $scalers.Params.FILTER_NAME`. 

Replace FILTER_NAME with the same name represented in the frontmatter (see step 2 above for reference).

5. Navigate to `javascript.html` and scroll down to where the `lunr()` function is being called. You will notice a callback function is being passed to the `lunr()` function. Within the callback function, you will also notice `this.field` being called with some values passed in. Append this block of code right after the last `this.field` function call:

```javascript
this.field("FILTER_NAME", {
  boost: 5,
});
``` 

Replace FILTER_NAME with the same name represented in the frontmatter (see step 2 above for reference).

Right after the `lunr()` function block, You will find where the `parse` object is being modified. Append your new filter option to the object:

```javascript
parse[doc.title] = {
  href: doc.href,
  title: doc.title,
  maintainer: doc.maintainer,
  description: doc.description,
  availability: doc.availability,
  category: doc.category,
  type: doc.type,
  FILTER_NAME: doc.FILTER_NAME
};
```

6. Navigate to `layouts/partials/scaler-layout.html`. Locate the div with a class name of `filter-options`. Within the div, add this new block:

```html
<div class="has-extra-top-margin">
  <h6>FILTER_NAME</h6>
  {{ $FILTER_NAME := slice }}
  {{ range $scalers :=  where site.RegularPages ".CurrentSection.Title" "Scalers" }}
    {{ with $scalers.Params.FILTER_NAME }}
        {{ $FILTER_NAME = $categories | append ($scalers.Params.FILTER_NAME) }}
        {{ $FILTER_NAME = uniq $FILTER_NAME }}
    {{ end }}
  {{ end }}
  {{ range $FILTER_NAME }}
  {{ $item := . }}
  <div>
      <input id="{{ . }}" type="checkbox" name="resource_filter" value="category:{{ . }}">
      <label for="{{ . }}">{{ . }}</label>
  </div>
  {{ end }}
</div>    
```

Replace FILTER_NAME with the same name represented in the frontmatter (see step 2 above for reference).

7. Save your changes and rebuild your frontend.

## Add new Frequently Asked Question (FAQ)

To update the KEDA [FAQ page](https://keda.sh/docs/faq), update the TOML file at
`data/faq20.toml`. Here's an example question/answer pair:

```toml
[[qna]]
q = "How can I add a new question/answer pair?"
a = "You're looking at it! 😀"
```

## Add new troubleshooting guidance

To add a new section to the [troubleshooting page](https://keda.sh/docs/troubleshooting):

```console
$ hugo new troubleshooting/<VERSION>/my-new-issue.md
```

To adjust the order in which the troubleshooting tiles appear, use the `weight`
parameter in each page's metadata.

## Working with documentation versions

The KEDA documentation is versioned. Each version has its own subdirectory under
[content/docs](content/docs). To add a new version, copy the directory for
the most recent version. Here's an example:

```console
$ cp -rf content/docs/<CurrentVersion> content/docs/<NewVersion>
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

### Publishing a new version

Once a version is ready to be published, we must add the version to the
`params.versions.docs` list in [config.toml](config.toml).

More recent versions should be placed first in the list (ordering *does* matter
because the first element in that list is considered the latest version).

> Note: Remember to [prepare the next version](#preparing-a-new-version).

[Contributing to KEDA]: CONTRIBUTING.md
[dashboard]: https://app.netlify.com/sites/keda
[deploy preview]: https://www.netlify.com/blog/2016/07/20/introducing-deploy-previews-in-netlify/
[keda.sh]: https://keda.sh
[localhost:8888]: http://localhost:8888
[LTS release]: https://nodejs.org/en/about/releases/
[Netlify]: https://netlify.com
[nvm]: https://github.com/nvm-sh/nvm/blob/master/README.md#installing-and-updating
