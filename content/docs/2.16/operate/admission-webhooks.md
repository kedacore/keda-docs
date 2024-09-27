+++
title = "Admission Webhooks"
description = "Admission webhooks configurations guidance"
weight = 100
+++

## Validation Enforcement

By default, the admission webhooks are registered with `failurePolicy: Ignore`, this won't block the resources creation/update when the admission controller is not available. To ensure that the validation is always required and perform validation, setting `failurePolicy` to `Fail` is required.

In particular, the admission webhooks for HPA ownership validation can be skipped by setting the annotation `validations.keda.sh/hpa-ownership` to `"false"`. Be cautious when doing so as it exposes the system to potential risks.

### Cache Miss with Fallback to Direct Client for ScaledObject

When validation enforcement is enabled, it's possible to run into a race condition when `ScaledObject` is part of the same deployment artifact as the `scaleTargetRef` (see also issue: [#5973](https://github.com/kedacore/keda/issues/5973)). For this purpose it's possible to configure additional argument for the webhook `Deployment`:
```
--cache-miss-to-direct-client=true
```
This will ensure that if getting the `scaleTargetRef` from the cached client returns `IsNotFound` error, webhook will attempt to getting the object directly from Kubernetes API.


## Custom Validations using Kubernetes ValidatingAdmissionPolicy

> ⚠️ FEATURE STATE: Kubernetes v1.30 [stable]

Kubernetes `ValidatingAdmissionPolicy` allows you to create custom validation policies using the [Common Expression Language (CEL)](https://cel.dev). This provides a declarative way to define and enforce validation rules directly within the cluster, helping ensure resource configurations meet your specified requirements. For more details, refer to the Kubernetes `ValidatingAdmissionPolicy` [documentation](https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/).

Here is an example of a `ValidatingAdmissionPolicy` and its corresponding `ValidatingAdmissionPolicyBinding` to fail/deny `ScaledObject`s with more than 10 replicas in the `default` namespace (i.e., limiting the maximum number of pod replicas to 10):

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: "limit-keda-replicas.example.com"
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups:   ["keda.sh"]
      apiVersions: ["v1alpha1"]
      operations:  ["CREATE", "UPDATE"]
      resources:   ["scaledobjects"]
  validations:
    - expression: "object.spec.maxReplicaCount <= 10"
      message: "The maximum allowed number of pod replicas is 10."
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: "limit-keda-replicas-binding.example.com"
spec:
  policyName: "limit-keda-replicas.example.com"
  validationActions: [Deny]
  matchResources:
    namespaceSelector:
      matchLabels:
        kubernetes.io/metadata.name: default
```

Since KEDA manages the `HorizontalPodAutoscaler` (HPA) behind the scenes, here is a complementary configuration to deny scaling for `HPA`, `Deployments`, and `ReplicaSets` with more than 10 replicas:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: "limit-apps-replicas.example.com"
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups:   ["apps"]
      apiVersions: ["v1"]
      operations:  ["CREATE", "UPDATE"]
      resources:   ["deployments", "replicasets"]
  validations:
    - expression: "object.spec.replicas <= 10"
      message: "The maximum allowed number of pod replicas is 10."
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: "limit-hpa-replicas.example.com"
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups:   ["autoscaling"]
      apiVersions: ["v2"]
      operations:  ["CREATE", "UPDATE"]
      resources:   ["horizontalpodautoscalers"]
  validations:
    - expression: "object.spec.replicas <= 10"
      message: "The maximum allowed number of pod replicas is 10."
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: "limit-apps-replicas-binding.example.com"
spec:
  policyName: "limit-apps-replicas.example.com"
  validationActions: [Deny]
  matchResources:
    namespaceSelector:
      matchLabels:
        kubernetes.io/metadata.name: default
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: "limit-hpa-replicas-binding.example.com"
spec:
  policyName: "limit-hpa-replicas.example.com"
  validationActions: [Deny]
  matchResources:
    namespaceSelector:
      matchLabels:
        kubernetes.io/metadata.name: default
```