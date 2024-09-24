+++
title = "KEDA Integration with Istio"
description = "Guidance for running KEDA along with Istio in your cluster"
availability = "v2.14+"
project = "Istio"
+++

## Overview

Integrating KEDA with Istio can present challenges, particularly in environments with enforced mTLS. This document provides guidance on how to configure KEDA to work within an Istio service mesh without disabling Istio sidecar injection. This solution allows KEDA components to communicate securely and effectively while maintaining compliance with security requirements.

This can be considered as workaround, however it's perfectly valid from the security standpoint. 
Keda is still using own mTLS certificates for secure communication between it's components and at the same time it's able to communicate with Istio Mesh services (like Prometheus) through Istio sidecar proxies.

## Background

In some scenarios, users might face issues with KEDA components failing discovery checks when Istio sidecar injection is enabled. The current [troubleshooting guide](../../../troubleshooting/istio-keda-faileddiscoverycheck) suggests disabling Istio sidecar injection in the KEDA namespace. However, if this is not feasible due to security policies, the following workaround can be applied.


### Requirements

- Istio version >= 1.18.*
- Kubernetes cluster with KEDA installed

### Example configuration

`values.yaml` fragment for the [helm chart](https://github.com/kedacore/charts/blob/main/keda/values.yaml)
```
... 

podAnnotations:
  # -- Pod annotations for KEDA operator
  keda:
    traffic.sidecar.istio.io/excludeInboundPorts: "9666"
    traffic.sidecar.istio.io/excludeOutboundPorts: "9443,6443"
  # -- Pod annotations for KEDA Metrics Adapter
  metricsAdapter:
    traffic.sidecar.istio.io/excludeInboundPorts: "6443"
    traffic.sidecar.istio.io/excludeOutboundPorts: "9666,9443"
  # -- Pod annotations for KEDA Admission webhooks
  webhooks:
    traffic.sidecar.istio.io/excludeInboundPorts: "9443"
    traffic.sidecar.istio.io/excludeOutboundPorts: "9666,6443"

...

```

*Check your respective ports set correctly for each component.*

### Applying the Annotations
- Annotate the KEDA Components: Update the deployment manifests for the KEDA operator, Metrics Adapter, and Admission Webhooks to include the specified pod annotations.
- Deploy Updated Manifests: Apply the updated manifests to your Kubernetes cluster.
- Verify Communication: Ensure that KEDA components can communicate internally and with external mesh services without failing discovery checks.


### References
For more information on the annotations used, refer to the Istio documentation on traffic management.
Existing troubleshooting guide for KEDA with Istio.

### Conclusion
By applying these annotations, you can ensure that KEDA integrates seamlessly with Istio while adhering to security requirements. This configuration allows KEDA to maintain internal mTLS communication and interact properly with other mesh services.

If you encounter any issues or have further questions, please refer to the KEDA and Istio documentation or reach out to our friendly community for support.
