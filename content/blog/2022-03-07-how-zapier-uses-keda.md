+++
title = "How Zapier uses KEDA"
date = 2022-02-14
author = "Ratnadeep Debnath (Zapier)"
aliases = [
"/blog/how-zapier-uses-keda"
]
+++

[RabbitMQ](https://www.rabbitmq.com/) is at the heart of Zap processing at [Zapier](https://zapier.com). We enqueue messages to RabbitMQ for each step in a Zap. These messages get consumed by our backend workers, which run on [Kubernetes](https://kubernetes.io). To keep up with the varying task loads in Zapier we need to scale our workers with our message backlog.

For a long time, we scaled with CPU-based autoscaling using Kubernetes native Horizontal Pod Autoscale (HPA), where more tasks led to more processing, increasing CPU usage, and triggering our workers' autoscaling. It seemed to work pretty well, except for certain edge cases.

We do a lot of [blocking I/O](https://medium.com/coderscorner/tale-of-client-server-and-socket-a6ef54a74763) in Python (we don’t use an event-based loop in our workers written in Python). This means that we could have a fleet of workers idling on blocking I/O with low CPU profiles while the queue keeps growing unbounded, as low CPU usage would prevent autoscaling from kicking in. In a situation where workers are idle while waiting for I/O, we could have a growing backlog of messages that a CPU-based autoscaler would miss. This situation allowed a traffic jam to form and introduce delays in processing Zap tasks.

Ideally, we would like to scale our workers on both CPU and our backlog of ready messages in RabbitMQ. Unfortunately, Kubernetes’ native HPA does not support scaling based on RabbitMQ queue length out of the box. There is a potential solution by collecting RabbitMQ metrics in Prometheus, creating a custom metrics server, and configuring HPA to use these metrics. However, this is a lot of work and why reinvent the wheel when there’s KEDA.

**Read the rest of this [post on how Zapier uses KEDA](https://www.cncf.io/blog/2022/01/21/keda-at-zapier/) on the Cloud Native Computing Foundation blog.**
