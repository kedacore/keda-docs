+++
title = "Why does Google Kubernetes Engine (GKE) 1.16 fail to fetch external metrics?"
+++

If you are running Google Kubernetes Engine (GKE) version 1.16, and are receiving the following error:

```
unable to fetch metrics from external metrics API: <METRIC>.external.metrics.k8s.io is forbidden: User "system:vpa-recommender" cannot list resource "<METRIC>" in API group "external.metrics.k8s.io" in the namespace "<NAMESPACE>": RBAC: clusterrole.rbac.authorization.k8s.io "external-metrics-reader" not found
```

You are almost certainly running into a [known issue](https://issuetracker.google.com/issues/160597676). 

The workaround is to recreate the `external-metrics-reader` role using the following YAML:

```
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: external-metrics-reader
rules:
- apiGroups:
  - "external.metrics.k8s.io"
  resources:
  - "*"
  verbs:
  - list
  - get
  - watch
```

The GKE team is currently working on a fix that they expect to have out in version >= 1.16.13.
