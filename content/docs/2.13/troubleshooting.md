+++
title = "Troubleshooting"
description = "How to address commonly encountered KEDA issues"
+++

## Troubleshoot keda errors using profiling

in golang we have the possibility to profile specific actions in order to determine what causes an issue.
For example, if our keda-operator pod is keeps getting OOM after a specific time, using profilig we can profile the heap and see what operatios taking all of this space.

Golang support many profiling options like heap, cpu, goroutines and more... (for more info check this site https://pkg.go.dev/net/http/pprof).

In keda we provide the option to enable profiling on each component separately by enabling it using
the helm chart and providing a port (if not enabled then it won't work)

```yaml
profiling:
  keda:
    enabled: false
    port: 8082
  metricsApiServer:
    enabled: false
    port: 8083
  webhooks:
    enabled: false
    port: 8084
```

If not using the helm chart then you can enabling the profiling on each on of the components by specifying
this argument:
```bash
--profiling-bind-address=":8082"
```
and it will be expose on the port you specify.

after enabling it you can port-forward or expose the service and use tool like go tool pprof in order to get profiling data.

For more info look at this document https://go.dev/blog/pprof.

{{< troubleshooting >}}
