+++
title = "Is short polling intervals a problem?"
weight = 80
+++

Polling interval really only impacts the time-to-activation (scaling from 0 to 1) but once scaled to one it's really up to the HPA (horizontal pod autoscaler) which polls KEDA.