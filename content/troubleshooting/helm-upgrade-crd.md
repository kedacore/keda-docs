+++
title = "Why is Helm not able to upgrade to v2.2.1 or above?"
+++

Our initial approach to manage CRDs through Helm was not ideal given it didn't update existing CRDs.

This is a [known limitation of Helm](https://helm.sh/docs/chart_best_practices/custom_resource_definitions/#install-a-crd-declaration-before-using-the-resource):

> There is no support at this time for upgrading or deleting CRDs using Helm. This was an explicit decision after much community discussion due to the danger for unintentional data loss. Furthermore, there is currently no community consensus around how to handle CRDs and their lifecycle. As this evolves, Helm will add support for those use cases.

As of [v2.2.1](https://github.com/kedacore/charts/releases/tag/v2.2.1) of our Helm chart, we have changed our approach so that we automatically managing the CRDs through our Helm chart.

Due to this transition, it can cause upgrade failures if you started using KEDA before v2.2.1 and will cause errors during upgrades such as the following:

> Error: UPGRADE FAILED: rendered manifests contain a resource that already exists. Unable to continue with update: CustomResourceDefinition "scaledobjects.keda.sh" in namespace "" exists and cannot be imported into the current release: invalid ownership metadata; label validation error: missing key "app.kubernetes.io/managed-by": must be set to "Helm"; annotation validation error: missing key "meta.helm.sh/release-name": must be set to "keda"; annotation validation error: missing key "meta.helm.sh/release-namespace": must be set to "keda"

In order to fix this, you will need to manually add the following attributes to our CRDs:

- `app.kubernetes.io/managed-by: Helm` label
- `meta.helm.sh/release-name: keda` annotation
- `meta.helm.sh/release-namespace: keda` annotation

Future upgrades should work seamlessly.
