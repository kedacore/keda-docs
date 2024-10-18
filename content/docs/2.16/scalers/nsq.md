+++
title = "NSQ"
availability = "v2.16+"
maintainer = "Community"
category = "Messaging"
description = "Scale applications based on NSQ topic/channel depth."
go_file = "nsq_scaler"
+++

### Trigger Specification

This specification describes the `nsq` trigger that scales based on [NSQ](https://github.com/nsqio/nsq) topic/channel depth. 

```yaml
triggers:
- type: nsq
  metadata:
    nsqLookupdHTTPAddresses: "nsq-nsqlookupd.nsq:4161"
    topic: "example_topic"
    channel: "example_channel"
    depthThreshold: "10"
    activationDepthThreshold: "0"
```

**Parameter list:**

- `nsqLookupdHTTPAddresses` - Comma separated list of [nsqlookupd](https://nsq.io/components/nsqlookupd.html) HTTP addresses in the form `<hostname>:<port>`.
- `topic` - Name of the NSQ datastream that the `channel` relates to.
- `channel` - Name of the channel used to calculate depth.
- `depthThreshold` - Target value for depth to trigger scaling actions. (Default `10`, Optional)
- `activationDepthThreshold` - Target value for depth to activate the scaler. (Default `0`, Optional)

> **Notice:**
> - Since ["channels are created on first use by subscribing to the named channel"](https://nsq.io/overview/design.html#simplifying-configuration-and-administration), the topic depth is used instead of the channel depth when the channel does not yet exist on an [nsqd](https://nsq.io/components/nsqd.html) instance. This allows KEDA to effectively bootstrap new channels when the `idleReplicaCount` is 0.
> - If the message flow for a channel is paused, KEDA will not scale up consumers of the channel, regardless of the depth.

### Example

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: nsq-scaledobject
spec:
  scaleTargetRef:
    name: nsq-consumer-deployment
  triggers:
  - type: nsq
    metadata:
      nsqLookupdHTTPAddresses: "nsq-nsqlookupd.nsq:4161"
      topic: "example_topic"
      channel: "example_channel"
      depthThreshold: "10"
      activationDepthThreshold: "0"
```
