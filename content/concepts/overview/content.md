+++
fragment = "content"
weight = 100

title = "Overview"

[sidebar]
  sticky = true
+++

### What is KEDA

KEDA is a Kubernetes-based Event Driven Autoscaler.  With KEDA, you can drive the scaling of any container in Kubernetes based on the number of events needing to be processed.  KEDA is a single-purpose and lightweight component that can be added into any Kubernetes cluster.  KEDA works alongside standard Kubernetes components like the horizontal pod autoscaler and can extend functionality without overwriting or duplication.  With KEDA you can explicitly map the apps you want to use event driven scale, with other apps continuing to function.  This makes KEDA a flexible and safe option to run alongside any number of any other Kubernetes applications or frameworks.

### How KEDA works

KEDA performs two key roles within Kubernetes.  First, it acts as an agent to activate and deactivate a deployment to scale to and from zero on no events.  This is one of the primary roles of the `keda-operator` container that runs when you install KEDA.  Second, KEDA acts as a [Kubernetes metrics server](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#support-for-custom-metrics) to expose rich event data like queue length or stream lag to the horizontal pod autoscaler to drive scale out.  It is up to the deployment to then consume the events directly from the source.  This preserves rich event integration and enables gestures like completing or abandoning queue messages to work out of the box.  The metric serving is the primary role of the `keda-operator-metrics-apiserver` container that runs when you install KEDA.

<p align="center"><img src="./../../images/keda-arch.png" width="550"/></p><br/>

#### Event sources and scalers

KEDA has a number of "scalers" that can both detect if a deployment should be activated or deactivated, and feed custom metrics for a specific event source.  [You can view the current list of scalers on the KEDA home page](/#scalers).

#### Custom Resources (CRD)

When you install KEDA, it will create two custom resources: `scaledobjects.keda.k8s.io` and `triggerauthentications.keda.k8s.io`.  These custom resources enable you to map an event source (and the authentication to that event source) to a deployment or job for scaling.  The `ScaledObjects` represent the desired mapping between an event source (e.g. Rabbit MQ) and the Kubernetes deployment.  A `ScaledObject` may also reference a `TriggerAuthentication` which contains the authentication configuration or secrets to monitor the event source.

### Deploy KEDA

[Click here for instructions on how to deploy KEDA into any cluster using a variety of tools](/deploy)