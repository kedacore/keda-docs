+++
title = "Troubleshooting"
weight = 600
+++

## KEDA logging and telemetry

The first place to look if something isn't behaving correctly is the logs generated from KEDA.  After deploying you should have a pod with two containers running within the namespace (by default: `keda`).

You can view the KEDA operator pod via kubectl:

```sh
kubectl get pods -n keda
```

You can view the logs for the keda operator container with the following:

```sh
kubectl logs -n keda {keda-pod-name} -c keda-operator
```

## Reporting issues

If you are having issues or hitting a potential bug, please file an issue [in the KEDA GitHub repo](https://github.com/kedacore/keda/issues/new/choose) with details, logs, and steps to reproduce the behavior.
