+++
title = "Scaling HTTP Applications"
weight = 300
+++

## Overview

KEDA provides a reliable and well tested solution to scaling your workloads based on external events. The project supports a wide variety of scalers, which support a [wide variety](/docs/2.4/scalers/) of event types, from cloud based queue systems to  Redis streams and more.

>KEDA and the HTTP Addon are separate projects. You can find KEDA on GitHub at [kedacore/keda](https://github.com/kedacore/keda) and the HTTP Addon at [kedacore/http-add-on](https://github.com/kedacore/http-add-on). In this document, we'll refer to the former as _KEDA Core_ and the latter as _KEDA HTTP_ to differentiate.

### HTTP is not a Standard Scaler

The event sources that KEDA supports are diverse, but all provide a well-defined API that can be used as an input to the [HPA](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/) calculation.

HTTP, on the other hand, has two key differences from the other scalers.

#### There is no Standard API for HTTP

While there are many high quality HTTP servers one can install and use, there is no standardized API to get the number of HTTP "events" from them. Further, there is no standard definition for what an HTTP "event" is.

#### HTTP Requests Must be Routed

If you create a `ScaledObject` or `ScaledJob`, KEDA will automatically scale your compute workload up or down and nothing else. If your application is scaled up, it is solely responsible for interacting with the external event source. In most cases, the application will process the same events that KEDA reacted to.

HTTP servers, however, don't work this way. If a system receives an HTTP request and scales up an application to handle it, the system must _deliver_ that request to the application, wait for the app to handle it, and then return the response. The HTTP Addon is necessarily involved with both scaling and facilitating the routing so that the HTTP event is processed.

### The KEDA HTTP Addon

This project, often called KEDA-HTTP, exists to provide that scaling. It is composed of simple, isolated components and includes an opinionated way to put them together.
