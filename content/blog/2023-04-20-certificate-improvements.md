+++
title = "Managing certificates with KEDA: A guide to securing your autoscaling"
date = 2023-04-20
author = "Jorge Turrado (SCRM Lidl International Hub)"
aliases = [
"/blog/how-to-manage-certificates-within-keda"
]
+++

Recently we have release KEDA v2.10, which has come with some important improvements related with the security and certificate management: 

- The usage of certificates to encrypt any communication between components.
- The support for providing your own certificated for internal communications.
- The support for providing customs CAs and trust in them.

Thanks to them, we can improve the security between KEDA components, but also between k8s API server and between KEDA and upstreams. Let's explain all of them deeper :) 

## Where do we come from?

KEDA is a component that runs on kubernetes, receiving request from kubernetes API server (from the HPA Controller) but also calling to multiple external sources (upstreams). 

For the first thing, we decided to skip the certificate validation using a built-in property, `insecureSkipTLSVerify`. Thanks to it, we could use self generate the metrics server certficate on every restart, not having to manage it and simplifying the process, but using at least an encrypted channel between kubernetes and KEDA metrics server.

The second case was more complicated... We really trust in the encryption as the way to achieve secure connections, so we wanted to support encrypted connection wherever a user wants to use them, but using self signed certificates is a really common scenario and that was complex to manage. As a first and fast option, we decided to support an extra parameter in some scalers to skip the certificate validation, allowing this scenarios.

Before version 2.9, KEDA was composed by 2 different components with totally different goals, the operator and the metrics server. As both components were independent by design, so we didn't need to secure anything between them, but it changed in version v2.9. [As we announced in KEDA v2.9 release](/blog/releases/2.9.0), we introduced an important chagne in the architecture. Now we have 2 components, but they are strong related and they need to have a secured channel for the internal communications.
