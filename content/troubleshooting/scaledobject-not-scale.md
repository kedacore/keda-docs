+++
title = "Why is my `ScaledObject` paused?"
weight = 1
+++

We discovered a bug in how KEDA manages the upstream errors. By design we'd like to keep the things like they are in case of failure getting the metrics from the upstream and the `fallback` section is not defined.

[We have fixed](https://github.com/kedacore/keda/pull/2604) it on v2.6.1 so after it, the new behavior is keeping the things like they are till having more information. This behavior could seem that the `ScaledObject` is paused (nothing will be done). 

You can check if this is your case reviewing the logs from the KEDA pods, if you are facing with this, you should see some errors in both pods (operator and metrics server)

> ⚠️ Are you using KEDA v2.6.0 or below? Then your workload will be scaled to 0. Because this can be tricky, we have changed this behavior to be more safe and not impact production workloads.

