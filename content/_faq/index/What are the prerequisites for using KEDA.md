+++
title = "What are the prerequisites for using KEDA?"
weight = 20
+++

KEDA is designed to be run on any Kubernetes cluster. It uses a CRD (custom resource definition) and the Kubenretes metric server so you will have to use a Kubernetes version which supports these. Any Kubernetes cluster >= 1.11.10 has been tested and should work.