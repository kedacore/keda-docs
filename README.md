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

## Contributing

We welcome issues and PRs! For details, see [Contributing to KEDA][].

If you submit a PR, Netlify will automatically create a [deploy preview][] so
that you can view your changes. Once merged, Netlify automatically deploys to
the production site [keda.sh][].

To see deploy logs and more, visit project's [dashboard][] -- Netlify login
required.

[Contributing to KEDA]: CONTRIBUTING.md
[dashboard]: https://app.netlify.com/sites/keda
[deploy preview]: https://www.netlify.com/blog/2016/07/20/introducing-deploy-previews-in-netlify/
[keda.sh]: https://keda.sh
