+++
title = "FAQ"
date = "2017-10-05"
fragment = "content"
weight = 100
+++

#### What is KEDA and why is it useful?
KEDA stands for Kubernetes-based Event Driven Auto-Scaler. It is built to be able to activate a Kubernetes deployment (i.e. no pods to a single pod) and subsequently to more pods based on events from various event sources.

#### What are the prerequisites for using KEDA?
KEDA is designed to be run on any Kubernetes cluster. It uses a CRD (custom resource definition) and the Kubenretes metric server so you will have to use a Kubernetes version which supports these. Any Kubernetes cluster >= 1.11.10 has been tested and should work.

#### Does KEDA depend on any Azure service?
No, KEDA only takes a dependency on standard Kubernetes constructs and can run on any Kubernetes cluster whether in OpenShift, AKS, GKE, EKS or your own infrastructure.

#### Does KEDA only work with Azure Functions?
No, KEDA can scale up/down any container that you specify in your deployment. There has been work done in the Azure Functions tooling to make it easy to scale an Azure Function container.

#### Why should we use KEDA if we are already use Azure Functions in Azure?

* Run functions on-premises (potentially in something like an 'intelligent edge' architecture)
* Run functions alongside other Kubernetes apps (maybe in a restricted network, app mesh, custom environment, etc.)
* Run functions outside of Azure (no vendor lock-in)
* Specific need for more control (GPU enabled compute clusters, policies, etc.)

#### Can I scale my HTTP container or function with KEDA and Kubernetes?
KEDA will scale a container using metrics from a scaler.  There is no scaler today for HTTP workloads directly.  We recommend using the prometheus scaler to create scale rule based on metrics around HTTP events for now.

####  Where can I get to the code for the Scalers?
All scalers have their code [here](https://github.com/kedacore/keda/tree/master/pkg/scalers)

#### Is short polling intervals a problem?
Polling interval really only impacts the time-to-activation (scaling from 0 to 1) but once scaled to one it's really up to the HPA (horizontal pod autoscaler) which polls KEDA.

#### How can I get involved?
There are several ways to get involved.

* Pick up an issue to work on. A good place to start might be issues which are marked as [Good First Issue](https://github.com/kedacore/keda/labels/good%20first%20issue) or [Help Wanted](https://github.com/kedacore/keda/labels/help%20wanted)
* We are always looking to add more scalers.
* We are always looking for more samples, documentation etc.
* Please join us in our [weekly standup](https://github.com/kedacore/keda#community-standup)

#### Can KEDA be used in production?
Yes! KEDA is now 1.0 and suited for production workloads.

#### What does it cost?
There is no charge for using KEDA itself.