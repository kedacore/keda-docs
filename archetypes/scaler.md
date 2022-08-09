+++
title = "{{ replace .Name "-" " " | title }}"
availability = ""
maintainer = ""
description = "Insert description here"
+++

### Trigger Specification

This specification describes the `*Scaler Type*` trigger that scales based on a Huawei Cloudeye.

```yaml
triggers:
  - type: *Scaler Type*
    metadata:
      namespace: SYS.ELB
```

**Parameter list:**

- `namespace` - Namespace of the metric. The format is service.item; service and item must be strings, must start with a letter, can only contain 0-9/a-z/A-Z/_, the total length of service.item is 3, the maximum is 32.

### Authentication Parameters

You can use `TriggerAuthentication` CRD to configure the authenticate by providing a set of IAM credentials.

**Credential based authentication:**

- `IdentityEndpoint` - Endpoint to verify the identity against.

The user will need access to read data from Huawei Cloudeye.

### Example

*Provide an example of how to configure the trigger, preferably using TriggerAuthentication*
