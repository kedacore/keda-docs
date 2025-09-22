+++
title = "Schema"
description = "Specification & generation of KEDA scalers' schema"
weight = 100
+++

## Scaler Schema

KEDA provides a separate scaler's schema for third-party usage. The schema file will keep updating according to the scaler's refactor.

## Specification

Here is a the schema of the scalers:

```
kedaVersion: main 
schemaVersion: 1
scalers:
    - type: activemq
      parameters:
        - name: managementEndpoint
          type: string
          optional: true
          metadataVariableReadable: true
        - name: destinationName
          type: string
          optional: true
          metadataVariableReadable: true
        - name: brokerName
          type: string
          optional: true
          metadataVariableReadable: true
        - name: username
          type: string
          metadataVariableReadable: true
          envVariableReadable: true
          triggerAuthenticationVariableReadable: true
        - name: password
          type: string
          metadataVariableReadable: true
          envVariableReadable: true
          triggerAuthenticationVariableReadable: true
        - name: corsHeader
          type: string
          optional: true
          metadataVariableReadable: true
        - name: restAPITemplate
          type: string
          optional: true
          metadataVariableReadable: true
        - name: targetQueueSize
          type: string
          default: "10"
          metadataVariableReadable: true
        - name: activationTargetQueueSize
          type: string
          default: "0"
          metadataVariableReadable: true
    - type: apache-kafka
      parameters:
        - name: bootstrapServers
        ...

```

**Metadata field's property detail:**
| Property  | Description 
|--------------|------------
| name         | the name of the field
| type         | type is the variable type of the field
| optional     | optional is a boolean that indicates if the field is optional
| default      | default is the default value of the field 
| allowedValue | allowedValue is a list of allowed values for the field
| deprecated   | deprecated is a string that indicates if the field is deprecated
| deprecatedAnnounce | deprecatedAnnounce is a string that indicates the deprecation message
| separator | separator is the symbol that separates the value of the field if the value is a list string
| exclusiveSet | exclusiveSet is a list of fields that are exclusive with the field
| rangeSeparator | rangeSeparator is the symbol that indicates the range of the field
| metadataVariableReadable | metadataVariableReadable is a boolean that indicates if the field can be read from the environment
| envVariableReadable | envVariableReadable is a boolean that indicates if the field can be read from the environment
| triggerAuthenticationVariableReadable | triggerAuthenticationVariableReadable is a boolean that indicates if the field can be read from the trigger authentication

## Generation

There are two ways to generate scaler schemas:

1. Run the GO file in the schema folder directly
```
go run schema/generate_scaler_schema.go
parameters:
  --keda-version string                Set the version of current KEDA in schema. (default "1.0")
  --kubeconfig string                  Paths to a kubeconfig. Only required if out-of-cluster.
  --output-file-path string            scaler-metadata-schemas.yaml output file path. (default "./")
  --scalers-builder-file buildScaler   The file that exists buildScaler func. (default "../pkg/scaling/scalers_builder.go")
  --scalers-files-dir string           The directory that exists all scalers' files. (default "../pkg/scalers")
  --specify-scaler string              Specify scaler name.
```

2. Use makefile
```
make  generate-scaler-schemas
env variables:
    OUTPUT_FILE_PATH          scaler-metadata-schemas.yaml output file path. (default "./")
    SCALERS_BUILDER_FILE   The file that exists buildScaler func. (default "../pkg/scaling/scalers_builder.go")
    SCALERS_FILES_DIR           The directory that exists all scalers' files. (default "../pkg/scalers")
```

 SCALERS_BUILDER_FILE ?= "pkg/scaling/scalers_builder.go" 
 SCALERS_FILES_DIR ?= "pkg/scalers" 
 OUTPUT_FILE_PATH ?= "schema/"
## Supported Scaler

| Scaler  |
| ------  |
| activemq
| apache-kafka
| arangodb
| artemis-queue
| aws-cloudwatch
| aws-dynamodb
| aws-dynamodb-streams
| aws-kinesis-stream
| aws-sqs-queue
| azure-eventhub
| azure-log-analytics
| azure-monitor
| azure-pipelines
| azure-queue
| azure-servicebus
| beanstalkd
| cpu
| memory
| cassandra
| couchdb
| cron
| datadog
| dynatrace
| elasticsearch
| etcd
| external-push
| external
| gcp-cloudtasks
| gcp-storage
| github-runner
| huawei-cloudeye
| ibmmq
| influxdb
| kubernetes-workload
| liiklus
| loki
| mssql
| mongodb
| mysql
| nats-jetstream
| nsq
| new-relic
| openstack-metric
| postgresql
| predictkube
| prometheus
| gcp-pubsub
| pulsar
| rabbitmq
| redis
| redis-cluster
| redis-sentinel
| redis-cluster-streams
| redis-sentinel-streams
| redis-streams
| selenium-grid
| solace-direct-messaging
| solace-event-queue
| solr
| splunk
| gcp-stackdriver
| sumologic
| temporal


