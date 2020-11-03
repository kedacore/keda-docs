+++
title = "Announcing KEDA 2.0 - Taking app autoscaling to the next level"
date = 2020-11-14
author = "KEDA Maintainers"
+++

A year ago, we were excited to **announce our 1.0 release with a core set of scalers**, allowing the community to start autoscaling Kubernetes deployments.  We were thrilled with the response and encouraged to see many users leveraging KEDA for event driven and serverless scale within any Kubernetes cluster.

With KEDA, any container can scale to zero and burst scale based directly on event source metrics.

![Logo](./../../img/logos/keda-horizontal-color.png)

While KEDA was initially started by Microsoft & Red Hat **we have always strived to be an open & vendor-neutral project** in order to support everybody who wants to scale applications.

That's why earlier this year we donated and were accepted as a CNCF Sandbox project. We feel this is a strong signal to the community to fully align with the CNCF open mindset and vendor neutrality.

**Since KEDA 1.0 was released we’ve been growing** with new scalers for many different sources including IBM MQ, Postgres, and Huawei Cloudeye, supporting new authentication providers such as HashiCorp Vault, and constantly improving the user experience to make application auto scaling dead-simple.

Today, we are happy to announce another milestone - **KEDA 2.0 is now generally available and ready to scale all your workloads!** 🎊

## Getting started

There are many ways to get started with KEDA:

- Install with [OperatorHub.io](https://operatorhub.io/operator/keda)

- Install with Helm:

>$ helm repo add kedacore https://kedacore.github.io/charts
>
>$ kubectl create namespace keda
>
>$ helm install keda kedacore/keda --namespace keda --version 2.0.0

- Install with deployment YAML:

> $ kubectl apply -f https://github.com/kedacore/keda/releases/download/v2.0.0/keda-2.0.0.yaml

Want to see it in action? Try one of [our samples](https://github.com/kedacore/samples#keda-20).

## What’s new? 🚀

KEDA 2.0 brings a ton of improvements and fixes. Please check the [changelog](https://github.com/kedacore/keda/blob/main/CHANGELOG.md#v200) to see the full list of changes and improvements in this release.

There are two types of workloads that can be autoscaled in Kubernetes cluster: a deployment-like workload or job-like workload. KEDA 1.x supported scaling of both types by specifying it in the ScaledObject resource, and was limited to only scaling Kubernetes `Deployment` or `Jobs` resources.

With KEDA 2.0 we have split both options and introduce a separate resource to describe both types, to better accommodate different needs for the configuration and behavior - **ScaledObject and ScaledJob resources**.

KEDA 2.0 brings another long awaited feature, **you can specify multiple triggers on one ScaledObject/ScaledJob**, this way your workload can be autoscaled based on different triggers (eg. Kafka and Prometheus), KEDA will select the maximum value from the scalers to define the scaling decision, ie. the target number of replicas.

### ScaledObject improvements

ScaledObject describes the specification for deployment-like workloads. And we are not talking just about `Kubernetes Deployments`, with **KEDA 2.0 you can scale `StatefulSets` or any other `CustomResource` that implements `/scale` subresource (eg. Argo Rollouts)**. This brings more scenarios and use cases that could benefit from KEDA and its autoscaling capabilities. Users can simply implement /scale endpoint on their Custom Resources and get autoscaling working out of the box!

If you are running KEDA on Kubernetes version >= 1.18, you can benefit from configurable scaling behavior, which allows you to **specify the behavior for scaling up and down**. This exposes these new capabilities of the Kubernetes Horizontal Pod Autoscaler to KEDA.

### Introducing ScaledJob

As mentioned earlier, KEDA 2.0 brings a separate custom resource for scaling of `Kubernetes Jobs`. This allows us to accommodate and simplify the specification and configuration, as scaling `Jobs` has different needs than scaling deployment-like workloads.

Scaling Jobs can have different use cases and those could be even different with different scalers. That’s why ScalingStrategy for ScaledJobs was introduced in KEDA 2.0, which allows users to **select different strategies for scaling of Kubernetes Jobs**.

### New scalers

KEDA 2.0 introduces **new scalers** for you to use.

For starters, our community worked together to add **Azure Log Analytics & IBM MQ scalers**.

By using our new CPU / Memory scaler you no longer have to mix & match Horizontal Pod Autoscalers (HPA) & ScaledObjects anymore - You can now **fully standardize on KEDA and we’ll handle all the HPAs for you!**

With our new **external push scaler**, you can build your own scaler and **trigger scaling actions in KEDA by using a push-model for more reactive autoscaling**, instead of a pull-model with our current pull-based model in our external scaler.

Finally, with our new **Metrics API scaler you can automatically scale on metrics provided through a REST API** without having to build your own scaler. This allows you to make autoscaling decisions based on a metric source that is available in your landscape (for example an in-house API or Microsoft Dynamics CRM API to automate processes).

On top of these new scalers, we’ve made a variety of improvements to the current scalers to optimize our scaling.

### Operations & Extensibility

KEDA now exposes **Liveness and Readiness probes** on both Operator and Metrics server pods, so administrators have a better overview of the state and health of KEDA.

KEDA Metrics Server now **exposes Prometheus metrics about each used scaler**. Currently these metrics work with ScaledObject metrics when the HorizontalPodAutoscaler is active (> 0 replicas). In further releases of KEDA there are plans to extend this capability and serve metrics for ScaledJobs as well.

Developers can now use a **go-client library** that is [exposed](https://github.com/kedacore/keda/tree/main/pkg/generated) to allow easy manipulation of the KEDA API from within applications.

## Migrating to KEDA 2.0

We want it to be super simple to use 2.0 as an existing customer! But what has changed?

We’re making some general changes:

- API namespace for KEDA Custom Resources Definitions (CRD) has changed from `keda.k8s.io` to `keda.sh`
- Scaling jobs is now done throught `ScaledJob` CRD, instead of `ScaledObject` CRD
- `ScaledObject` is now using `spec.scaleTargetRef.name`, instead of `spec.scaleTargetRef.deploymentName`
- `ScaledObject` no longer requires `deploymentName` label _(last couple of v1 releases were already ignoring it)_

In order to provide a more consistent experience across all scalers, we’re introducing improved flexibility & usability of trigger metadata for which we had to do some [cross-scaler breaking changes](https://keda.sh/docs/2.0/migration/#improved-flexibility--usability-of-trigger-metadata) as well as improvements for [Azure Service Bus, Kafka & RabbitMQ scalers](https://keda.sh/docs/2.0/migration/#scalers).

Learn more about how to migrate by using our [migration guide](https://keda.sh/docs/2.0/migration/)!

> **⚠ Running KEDA 1.x & 2.0 side-by-side is not supported.**
>
> KEDA comes with a metrics server and Kubernetes only allows you to run one of them in a cluster.
>
>*Learn more about how KEDA is architected in [our docs](http://keda.sh/docs/latest/concepts/#architecture).*

## KEDA 💘 Community

**KEDA would not have been what it is today without our great community** - They have helped us shape our KEDA 2.0 release with their feature request, contributions, testing our release candidates and their support!

It is wonderful to see how **more and more people from [across the globe](https://keda.devstats.cncf.io/d/50/countries-statistics-in-repository-groups?orgId=1&var-period_name=Quarter&var-countries=All&var-repogroup_name=All&var-metric=contributions&var-cum=countries) start to contribute back** from companies such as IBM, Oracle, Pivotal, Polidea, Tripadvisor, VMWare, Zapier and [so many more](https://keda.devstats.cncf.io/d/4/company-statistics-by-repository-group?orgId=1&var-period=m&var-metric=activity&var-repogroup_name=All&var-companies=All) - We could not have done this without them!

We’re honored to see other technologies adopting KEDA to use in their own products, here are a few of them:

- **Apache Airflow & Astronomer** are using KEDA to autoscale workflows. ([blog post](https://www.astronomer.io/blog/the-keda-autoscaler/))
- **Dapr** is recommending KEDA to autoscale Dapr apps ([walkthrough](https://docs.dapr.io/developing-applications/integrations/autoscale-keda/) & [sample](https://github.com/dapr/samples/blob/master/functions-and-keda/README.md))
- **Fission** is building a catalog of KEDA connectors to scale their serverless functions on Kubernetes ([GitHub](https://github.com/fission/keda-connectors))
- **Knative** is using KEDA to autoscale Knative Event Sources ([GitHub](https://github.com/knative-sandbox/eventing-autoscaler-keda))

We are super thankful that these companies and technologies have adopted KEDA:

{{< user-icons >}}

Another user of KEDA is Alibaba Cloud who has adopted KEDA for all their autoscaling:

> “Alibaba's [Enterprise Distributed Application Service (EDAS)](https://www.alibabacloud.com/product/edas) which is built with [KubeVela](https://github.com/oam-dev/kubevela/) project adopts KEDA as the implementation for its auto-scaling trait (see: [trait system of Open Application Model](https://github.com/oam-dev/spec/blob/master/6.traits.md)) from mid of 2020. In Alibaba, EDAS has served more than 1000+ applications from both Alibaba Cloud's customers and internal scenarios. EDAS's KEDA based auto-scaling trait uses Alibaba's ARMS (i.e. Application Real-Time Monitoring Service) as the trigger by default, and it's also under integration with AIOps system of EDAS for advanced scenarios such as capacity diagnose based auto-scaling.”
>
> -- *Lei Zhang, Staff Engineer at Alibaba Cloud & SIG App Delivery Chair*

Are you using KEDA in production as well? Don’t hesitate and [let us know](https://github.com/kedacore/keda#become-a-listed-keda-user)!

## Looking ahead 🧭

We’ve been working on this milestone for a while and are happy to finally be able to officially release KEDA 2.0! But we’re not stopping there and have already started working on v2.1.

Transparency is essential to become a successful open-source project and we want to be open on the future of KEDA. Because of that, we’re introducing a **public high-level roadmap of KEDA** ([link](https://github.com/kedacore/keda/projects/3)) allowing you to get an idea of where we are going with the project and allow you to provide suggestions so we can adapt.

Next, we are going to **further improve KEDA as a project and focus on making it more robust** by introducing a security policy, automated vulnerability scanning, and such to ensure we are shipping secure software so that you don’t have to worry about it.

As KEDA continues to grow, many organizations have contributed back and shared a number of very interesting use cases that rely on KEDA. We are working on writing a reference case to show the value of KEDA for customers.

As we continue to work with the community, our goal is to **propose to graduate to CNCF Incubation** ([issue](https://github.com/kedacore/keda/issues/1143)) **later this year / early next year**. Any support we can get from the community will be extremely helpful as we move to make the next steps in bringing the benefits of KEDA to every user.

Last but not least, we want people to be able to show their support for KEDA and are working on **providing merchandise** that you can purchase which you can wear with pride! Sit back and wait for our swag to show up.

Thanks for reading, and happy scaling!

KEDA Maintainers.
