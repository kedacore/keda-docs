# KEDA - Docs
Documentation and landing page for KEDA.

## Building docs locally

Install Hugo Extended:

Windows:

```
choco install hugo-extended
```

Mac:

```
brew install hugo
```

Run docs locally:

```
hugo server -D
```

## Adding a new scaler

It is super simple to contribute documentation for a new scaler:

1. Create a copy of `scaler.template` in `content\scalers\` for your scaler
2. Fill in the template
    - Replace `*Scaler Name*` with the name of your scaler, ie `Huawei CloudEye`
    - Replace `*Scaler Type*` with the unique identifier of the scaler, ie `huawei-cloudeye`
    - Replace `*Version*` with the version of KEDA which introduces the scaler
    - List all the parameters
        - The template provides an example with `namespace`
    - List the available authentication parameters that can be used with TriggerAuthentication, if applicable
        - The template provides an example with `IdentityEndpoint`
    - Provide an example of how to use the new scaler
3. Open a PR

If you want to get some inspiration, our [Azure Monitor scaler](https://github.com/kedacore/keda-docs/blob/master/content/scalers/azure-monitor.md) is a good example.