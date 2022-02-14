+++
title = "Why is my `ScaledObject` paused?"
weight = 1
+++

When KEDA has upstream errors to get scaler source information it will keep the current instance count of the workload unless the `fallback` section is defined.

This behavior might feel like the autoscaling is not happening, but in reality, it is because of problems related to the scaler source.

You can check if this is your case by reviewing the logs from the KEDA pods where you should see errors in both our operator and metrics server.

