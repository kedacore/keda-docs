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
KEDA will scale a container using metrics from a scaler, but unfortunately there is no scaler today for HTTP workloads. 

We recommend using the [Prometheus scaler](https://keda.sh/scalers/prometheus/) to create scale rule based on metrics around HTTP events for now. Read [Anirudh Garg's blog post](https://dev.to/anirudhgarg_99/scale-up-and-down-a-http-triggered-function-app-in-kubernetes-using-keda-4m42) to learn more.

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

#### How to make KEDA work in a proxy network?
If while setting up KEDA, you get an error: `(v1beta1.external.metrics.k8s.io) status FailedDiscoveryCheck` with a message: `no response from https://ip:443: Get https://ip:443: net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)`.

 One of the reason for this can be that you are behind a proxy network.

###### Check the status:

Find the api service name for the service `keda/keda-metrics-apiserver`:

```kubectl get apiservice --all-namespaces```

Check for the status of the api service found in previous step:

```kubectl get apiservice <apiservicename' -o yaml```

Example: ```kubectl get apiservice v1beta1.external.metrics.k8s.io -o yaml```

If the status is `False`, then there seems to be an issue and proxy network might be the primary reason for it.

###### Follow these steps:

Find the cluster IP for the `keda-metrics-apiserver` and `keda-operator-metrics`:

```kubectl get services --all-namespaces```

In the `/etc/kubernetes/manifests/kube-apiserver.yaml` - add the cluster IPs found in the previous step in no_proxy variable.

Reload systemd manager configuration:

```sudo systemctl daemon-reload```

Restart kubelet:

```sudo systemctl restart kubelet```

Check the API service status and the pods now. Should work!

#### What does it cost?
There is no charge for using KEDA itself.

#### How do I access KEDA resources using `client-go`?

KEDA resources can be accessed using the [dynamic
client](https://godoc.org/k8s.io/client-go/dynamic) from the `client-go` package.  The dynamic client's `Resource()` method accepts a
[GroupVersionResource](https://godoc.org/k8s.io/apimachinery/pkg/runtime/schema#GroupVersionResource)
describing the type of resource to be accessed and returns a
[NamespaceableResourceInterface](https://godoc.org/k8s.io/client-go/dynamic#NamespaceableResourceInterface)
which contains methods to retrieve, create, or maniuplate that resource.  Here's a code sample
containing a function that retrieves a KEDA `ScaledObject` resource by name.

```Go
package main

import (
	"fmt"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	_ "k8s.io/client-go/plugin/pkg/client/auth/gcp"
	"k8s.io/client-go/tools/clientcmd"
	"os"
)

var (
	kedaGVR = schema.GroupVersionResource{
		Group:    "keda.k8s.io",
		Version:  "v1alpha1",
		Resource: "scaledobjects",
	}
)

func GetScaledObjectByName(name string) {
	config, err := clientcmd.BuildConfigFromFlags("", os.Getenv("HOME")+"/.kube/config")
	dynClient, err := dynamic.NewForConfig(config)
	if err != nil {
		panic(err)
	}
	scaledObjectClient := dynClient.Resource(kedaGVR)
	scaledObject, err := scaledObjectClient.Namespace("default").Get(name, metav1.GetOptions{})
	if err != nil {
		fmt.Printf("Error retrieving scaledobjects: %s\n", err)
	} else {
		fmt.Printf("Got ScaledObject:\n %v", scaledObject)
	}
}
```
