+++
title = "Support"
description = "Support for deploying and using KEDA"
+++

## Open-Source (OSS) support
KEDA is an open-source project under CNCF Foundation and provides best-effort support and use GitHub for tracking bugs and feature requests.

Want to contribute a feature or fix? We are more than happy to review requests and contributions, but recommend going through our [contribution guide](https://github.com/kedacore/keda/blob/main/CONTRIBUTING.md).

Learn more in our [support policy](https://github.com/kedacore/governance/blob/main/SUPPORT.md).

## Commercial support
Here's an overview of all vendors that provide KEDA as part of their offering/product and provide support for it: 

{{< support >}}

## Kubernetes support
The supported window of Kubernetes versions with KEDA is known as "N-2" which means that KEDA will provide support for running on N-2 at least.

However, maintainers can decide to extend this by supporting more minor versions based on the required CRDs being used; but there is no guarantee.

> Example - At time of writing, Kubernetes 1.25 is the latest minor version so KEDA can only use new features that were introduced in 1.23

You can learn more about the currently supported Kubernetes version in our [FAQ](https://keda.sh/docs/latest/faq/).