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
      metadata:
        - name: managementEndpoint
          type: string
          optional: true
        - name: destinationName
          type: string
          optional: true
        - name: brokerName
          type: string
          optional: true
        - name: username
          type: string
          canReadFromEnv: true
          canReadFromAuth: true
        - name: password
          type: string
          canReadFromEnv: true
          canReadFromAuth: true
        - name: corsHeader
          type: string
          optional: true
        - name: restAPITemplate
          type: string
          optional: true
        - name: targetQueueSize
          type: string
          optional: true
          default: "10"
        - name: activationTargetQueueSize
          type: string
          optional: true
          default: "0"
    - type: apache-kafka
      metadata:
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
| canReadFromEnv | canReadFromEnv is a boolean that indicates if the field can be read from the environment
| canReadFromAuth | canReadFromAuthis a boolean that indicates if the field can be read from the TriggerAuthentication

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
|activemq
|apache-kafka
|arangodb
|aws-cloudwatch
|aws-dynamodb
|aws-dynamodb-streams
|aws-kinesis-stream
|aws-sqs-queue
|etcd
|gcp-cloudtasks
|ibmmq
|influxdb
|kubernetes-workload
|nsq
|postgresql
|predictkube
|prometheus
|rabbitmq
|redis-sentinel
|redis
|redis-cluster
|redis-cluster-streams
|redis-sentinel-streams
|redis-streams
|selenium-grid
|solace-event-queue
|solr
|splunk


