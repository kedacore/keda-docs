+++
title = "Give KEDA 2.0 (Alpha) a test drive"
date = 2020-08-17 # TODO: Update with actual date
author = "Tom Kerkhove"
+++

Today, we are happy to share that our first **alpha version of KEDA 2.0 is available**! 🎊

# Highlights

With this release, we are shipping majority of our planned features.

Here are some highlights:

- **Making scaling more powerful**
    - Introduction of `ScaledJob` ([docs](https://keda.sh/docs/2.0/concepts/scaling-jobs/))
    - Support for scaling Deployments, Stateful Sets and/or any Custom Resources ([docs](https://keda.sh/docs/2.0/concepts/scaling-deployments/))
    - Support for scaling on standard resource metrics (CPU/Memory)
    - Support for multiple triggers in a single `ScaledObject` ([docs](https://keda.sh/docs/2.0/concepts/scaling-deployments/))
    - Support for scaling to original replica count after deleting `ScaledObject` ([docs](https://keda.sh/docs/2.0/concepts/scaling-deployments/))
    - Support for controling scaling behavior of underlying HPA
- **Easier to operate KEDA**
    - Introduction of readiness and liveness probes
    - Introduction of Prometheus metrics for Metrics Server ([docs](https://keda.sh/docs/2.0/operate/))
    - Provide more information when quering KEDA resources with `kubectl`
- **Extensibility**
    - Introduction of External Push scaler ([docs](https://keda.sh/docs/2.0/scalers/external-push/))
    - Provide Go client

For a full list of changes, we highly recommend going through [our changelog](https://github.com/kedacore/keda/blob/v2/CHANGELOG.md#v200)!

# Getting started

TODO but need input, just list Helm? This legit?

>$ helm install keda kedacore/keda --namespace keda --version 2.0.0-alpha


# Migrating to KEDA 2.0

We want it to be super simple to use 2.0 as an existing customer! But what has changed?

- API namespace for KEDA Custom Resources Definitions (CRD) has changed from `keda.k8s.io` to `keda.sh`
- Scaling jobs is now done throught `ScaledJob` CRD, instead of `ScaledObject` CRD
- `ScaledObject` is now using `spec.scaleTargetRef.name`, instead of `spec.scaleTargetRef.deploymentName`
- `ScaledObject` no longer requires `deploymentName` label _(last couple of v1 releases were already ignoring it)_

Learn more on how to migrate by using our [migration guide](https://keda.sh/docs/2.0/migration/)!

With our official release we will provide [migration scripts](https://github.com/kedacore/keda/issues/946) allowing you to migrate your KEDA resources automatically.

> **⚠ Running KEDA 1.x & 2.0 Alpha side-by-side is not supported.**
> 
> KEDA is comes with a metrics server and Kubernetes only allows you to run one of them in a cluster.
> 
>_Learn more about how KEDA is architected in [our docs](http://keda.sh/docs/latest/concepts/#architecture)._

# Conclusion

We are looking forward to hearing your feedback:

- What do you like and/or what could be improved?
- What issues did you find?
- How can the migration be smoother?

While we are eagerly waiting for feedback, we plan to release KEDA 2.0 by the end of August, 2020.

Thanks for reading, and happy scaling!

Tom Kerkhove
