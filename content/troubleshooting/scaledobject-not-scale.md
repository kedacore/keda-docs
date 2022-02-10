+++
title = "Why is the `ScaledObject` paused?"
weight = 1
+++

We discovered a bug in how KEDA manages the upstream errors. By design we'd like to keep the things like they are in case of failure getting the metrics from the upstream and the `fallback` section is not defined.

Before v2.6.1 the behavior in that case was scaling to zero the workload (which is risky) and we have fixed it on v2.6.1 so after it, the new behavior is keeping the things like they are till having more information. This behavior could seem that the `ScaledObject` is paused (nothing will be done). 

You can check if this is your case reviewing the logs from the KEDA pods, if you are facing with this, you should see some errors in both pods (operator and metrics server)