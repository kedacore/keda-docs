+++
title = "Can we scale HTTP workloads with KEDA?"
weight = 80
+++

KEDA will scale a container using metrics from a scaler.  There is no scaler today for HTTP workloads directly.  We recommend using the prometheus scaler to create scale rule based on metrics around HTTP events for now.