+++
title = "Glossary"
weight = 1000
+++

This document defines the various terms needed to understand the documentation and set up and use KEDA.

## Admission Webhook

[In Kubernetes](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/), an HTTP callback that handle admission requests. KEDA uses an admission webhook to validate and mutate ScaledObject resources.

## Agent

A primary role held by the KEDA operator. The Agent activates and deactivates Kubernetes Deployments to scale to and from zero.

## Cluster

[In Kubernetes](https://kubernetes.io/docs/reference/glossary/?fundamental=true#term-cluster), a set of one or more nodes that run containerized applications.

## CRD 

Custom Resource Definition. [In Kubernetes](https://kubernetes.io/docs/reference/glossary/?fundamental=true#term-CustomResourceDefinition), a custom resource that extends the Kubernetes API with custom resources like ScaledObjects that have custom fields and behavior.

## Event

A notable occurrence captured by an event source that KEDA may use as a trigger to scale a container or deployment.

## Event Source

An external system like Kafka, RabbitMQ, that generates events that KEDA can monitor using a scaler.

## Grafana

An open-source monitoring platform that can visualize metrics collected by KEDA.

## gRPC Remote Procedure Calls (gRPC)

gRPC Remote Procedure Calls (gRPC). An open-source remote procedure call framework used by KEDA components to communicate.

## HPA 

Horizontal Pod Autoscaler. Kubernetes autoscaler. By default, scales based on CPU/memory usage. KEDA uses HPA to scale Kubernetes clusters and deployments.

## KEDA 

Kubernetes Event-Driven Autoscaling. A single-purpose, lightweight autoscaler that can scale a Kubernetes workload based on event metrics.

## Metric

Measurement of an event source such as queue length or response lag that KEDA uses to determine scaling.

## OpenTelemetry 

An observability framework used by KEDA to instrument applications and collect metrics.

## Operator

The core KEDA component that monitors metrics and scales workloads accordingly.

## Prometheus

An open-source monitoring system that can scrape and store metrics from KEDA.

## Scaled Object

A custom resource that defines how KEDA should scale a workload based on events.

## Scaled Job

A custom resource KEDA uses to scale an application.

## Scaler

A component that integrates KEDA with a specific event source to collect metrics.

## Stateful Set

A Kubernetes workload with persistent data. KEDA can scale stateful sets.

## TLS

Transport Layer Security. KEDA uses TLS to encrypt communications between KEDA components.

## Webhook

An HTTP callback used to notify KEDA of events from external sources.

[In Kubernetes](https://kubernetes.io/docs/reference/access-authn-authz/webhook/), an HTTP callback used as an event notification mechanism.
