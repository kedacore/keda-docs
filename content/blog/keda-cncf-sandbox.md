+++
title = "Kubernetes Event-driven Autoscaling (KEDA) is now an official CNCF Sandbox project 🎉"
date = 2020-03-31
author = "KEDA Maintainers"
+++

Over the past year, We've been contributing to Kubernetes Event-Driven Autoscaling (KEDA), which makes application autoscaling on Kubernetes dead simple. If you have missed it, read about it in our ["Exploring Kubernetes-based event-driven autoscaling (KEDA)"](https://blog.tomkerkhove.be/2019/06/11/a-closer-look-at-kubernetes-based-event-driven-autoscaling-keda/) blog post.

We started the KEDA project to address an essential missing feature in the Kubernetes autoscaling story. Namely, the ability to autoscale on arbitrary metrics. Before KEDA, users were only able to autoscale based on metrics such as memory and CPU usage. While these values are essential for autoscaling, they disregard a rich world of external metrics from sources such as Azure, AWS, GCP, Redis, and Kafka (among many more).

To address this need, KEDA provides a simple, unified API to autoscale deployments without  an in-depth knowledge of Kubernetes internals. With KEDA, users can now treat their Kubernetes deployments like FaaS or PaaS applications with ease!

In the incredible year since we announced KEDA publicly, adoption has been increasing, and every week we find more passionate and excited members in our weekly community standups. Members of the Kubernetes community have been incredibly accepting. They have been providing feedback, contributing features, and offering great suggestions for the future of our project.

On November 19, 2019, we released [Kubernetes Event-Driven Autoscaling (KEDA) v1.0](https://cloudblogs.microsoft.com/opensource/2019/11/19/keda-1-0-release-kubernetes-based-event-driven-autoscaling/). This release introduced a ton of features including support for multiple workloads (deployments & jobs), simplified deployment with Helm, documentation on [keda.sh](http://keda.sh/), and (my personal favorite) enterprise-class security with TriggerAuthentication CRD (which allows you to use pod identities such as Azure Managed Identity for pods).

Over time our community has grown - More and more companies such as IBM, Pivotal, VMware, [Astronomer](https://www.astronomer.io/),  and more started contributing to KEDA, we are collaborating with [Knative project](https://knative.dev/) to provide seamless integration with each other and our user base started growing with companies such as, [Purefacts](https://www.purefacts.com/), [SwissRe](https://www.swissre.com/) and more!

We want to give KEDA more room to grow independently and ensure it has a vendor-agnostic focus. That's why on Jan 14, 2020, we proposed KEDA to  the CNCF as a new Sandbox project.

**Today, we are happy to announce that KEDA is now an [official CNCF Sandbox project](https://www.cncf.io/sandbox-projects/)!** By contributing KEDA to the CNCF we hope to ensure the adoption of KEDA continues to increase and hope to see more companies contribute scalers, integrate it in their products and give it a neutral home. This is a major step and I'm sure the best is yet to come.

We would love to explicitly thank Liz Rice, Michelle Noorali & Xiang Lifor being our CNCF TOC sponsors and supporting KEDA as well as SIG-Runtime, especially Ricardo Aravena, for recommending us to TOC!

So... what's next?

In the near-term, we plan to focus on two major topics:  Autoscaling HTTP workloads and scalers!

Currently, we do not support HTTP-based autoscaling out-of-the-box, so we hope to create on a Service Mesh Interface (SMI) scaler for autoscaling service mesh workloads!

In parallel, we have started plans for implementing add-on scalers. What are add-on scalers? We’re glad you've asked! Add-on scalers make it easy for users to define custom [external scalers](https://keda.sh/scalers/external/) without needing to contribute code to KEDA directly. One example of an external scaler is the [Azure Durable Function scaler](https://github.com/kedacore/keda-scaler-durable-functions).

As this project evolves, our main focus will be to provide guidelines around when to add a scaler to the core and when  to offer it as an external add-on. Next to that, we can create a centralized hub for all add-on scalers to improve discoverability similar to what [Helm Hub](https://hub.helm.sh/) provides.

We have a lot of ideas and plans but we mainly are interested in what you want! Are you missing scalers, features or capabilities? Let us know!

Thanks for reading, and happy scaling!

KEDA Maintainers.
