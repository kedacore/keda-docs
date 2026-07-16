+++
title = "KEDA HTTP Add-on"
description = "HTTP-based autoscaling for Kubernetes workloads, including scale-to-zero"
weight = 1
+++

The KEDA HTTP Add-on enables automatic scaling of HTTP workloads on Kubernetes based on incoming traffic, including scaling to and from zero replicas.
It extends [KEDA](https://keda.sh) with the infrastructure needed to intercept HTTP requests, count them, and report metrics that drive scaling decisions.

## How It Works

The HTTP Add-on deploys three components into your cluster:

- An **interceptor** that sits in front of your application as a reverse proxy, routing requests and tracking concurrency.
- A **scaler** that aggregates request metrics from the interceptor and reports them to KEDA.
- An **operator** that manages the lifecycle of scaling resources.

You create an `InterceptorRoute` to define how traffic reaches your service and a KEDA `ScaledObject` to control scaling behavior.
The interceptor handles requests while KEDA scales your workload up and down based on demand.

## Get Started

If you are new to the HTTP Add-on, follow the [Getting Started guide](getting-started/) to deploy and scale your first HTTP application.

## Upgrading from a Previous Version

v0.14.0 introduces the `InterceptorRoute` (v1beta1) API, which replaces `HTTPScaledObject` (v1alpha1).
If you have existing `HTTPScaledObject` resources, see [Migrate from HTTPScaledObject to InterceptorRoute](operations/migrate-httpscaledobject-to-interceptorroute/).

## Documentation Sections

- **[Getting Started](getting-started/)** — Tutorial: install the add-on and scale your first app end-to-end.
- **[Concepts](concepts/)** — Understand the architecture, scaling mechanics, and routing model.
- **[User Guide](user-guide/)** — Configure autoscaling, routing, and timeouts for your HTTP applications.
- **[Operations](operations/)** — Install, configure, and manage the HTTP Add-on infrastructure.
- **[Reference](reference/)** — API specifications, Helm chart values, environment variables, and metrics.

## Getting Help

- [Kubernetes Slack](https://kubernetes.slack.com/archives/CKZJ36A5D) — `#keda` channel ([join here](https://slack.k8s.io))
- [GitHub Issues](https://github.com/kedacore/http-add-on/issues) — Bug reports and feature requests
- [GitHub Discussions](https://github.com/kedacore/http-add-on/discussions) — Questions and general conversation

## Contributing

Contributions to the HTTP Add-on are welcome.
See the [contributing guide](https://github.com/kedacore/http-add-on/blob/main/CONTRIBUTING.md) in the source repository for development setup, commit conventions, and PR guidelines.
