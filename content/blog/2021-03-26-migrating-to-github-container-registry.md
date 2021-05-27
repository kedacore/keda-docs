+++
title = "Migrating our container images to GitHub Container Registry"
date = 2021-03-26
author = "KEDA Maintainers"
aliases = [
    "/blog/migrating-to-github-container-registry/"
]
+++

We provide **various ways to [deploy KEDA](https://keda.sh/docs/latest/deploy/) in your cluster** including by using [Helm chart](https://github.com/kedacore/charts), [Operator Hub](https://operatorhub.io/operator/keda) and raw YAML specifications.

These deployment options all rely on the container images that we provide which are available on **[Docker Hub](https://hub.docker.com/u/kedacore), the industry standard for public container images**.

However, we have found that Docker Hub is no longer the best place for our container images and are migrating to GitHub Container Registry (Preview).

## Why are making this change?

### Docker Hub is introducing rate limiting and image retention

Over the past couple of years, Docker Hub has become the industry standard for hosting public container images. This has become a big burden for Docker to manage all the traffic and decided in 2020 to make some changes:

- Anonymous image pulls are being rate limited
- Unused images will no longer be retained

Because we want to ensure that our end-users can use KEDA without any issues, we want to make them available to anyone without any limitations.

Learn more about these changes in [Docker's FAQ](https://www.docker.com/pricing/resource-consumption-updates) and our issue on [GitHub](https://github.com/kedacore/keda/issues/995).

### Gaining insights on KEDA adoption

As maintainers, **we find it hard to measure the adoption of KEDA** to understand how many end-users are using older versions of KEDA and what the growth is over time.

Docker Hub provides a vague total pull count per container image, but it does not give in-depth details concerning the tags and what the pull growth is over time.

In GitHub Container Registry, however, **metrics are provided out-of-the-box on a per-tag basis** allowing us to better understand what our customers are using and make better decisions when we no longer support a given version.

### Bringing our artifacts closer to home

Lastly, we want to **bring our artifacts closer to our home on GitHub**. By using more of the GitHub ecosystem, we believe that this integration will only improve and get tighter integration with our releases and such.

## What is changing?

Our container images are being published on [GitHub Container Registry](https://github.com/orgs/kedacore/packages?type=source) for end-users to pull them.

Because of this, the names of our container images are changing:

| Component      | New Image (GitHub Container Registry)     | Legacy Image (Docker Hub)         |
| :------------- | :---------------------------------------- | --------------------------------- |
| Metrics Server | `ghcr.io/kedacore/keda-metrics-apiserver` | `kedacore/keda-metrics-apiserver` |
| Operator       | `ghcr.io/kedacore/keda`                   | `kedacore/keda`                   |

## When is this taking place?

As of v2.2, we have started publishing our new container images to GitHub Container Registry in parallel to Docker Hub.

This allows customers to already migrate to our new registry and consume our artifacts there.

**Once GitHub Container Registry becomes generally available (GA), we will no longer publish new versions to Docker Hub.**

## What is the impact for end-users?

**If you are using one of our deployment options, end-users are not be impacted.**

Since v2.2, we are using GitHub Container Registry by default and you are good to go.

If you are using your own deployment mechanism, then you will have to pull the container images from GitHub Container Registry instead.

## Join the conversation

Do you have questions or remarks? Feel free to join the conversation on [GitHub Discussions](https://github.com/kedacore/keda/discussions/1700).

Thanks for reading, and happy scaling!

KEDA Maintainers.