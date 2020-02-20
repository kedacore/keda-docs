# KEDA - Docs
Documentation and landing page for KEDA

## Adding a new scaler

It is super simple to contribute documentation for a new scaler:

1. Create a copy of `scaler.template` in `content\scalers\` for your scaler
2. Fill in the template
    - Replace `*Scaler Name*` with the name of your scaler
    - Replace `*Version*` with the version of KEDA which introduces the scaler
    - List all the parameters
3. Open a PR

If you want to get some inspiration, our [Azure Monitor scaler](https://github.com/kedacore/keda-docs/blob/master/content/scalers/azure-monitor.md) is a good example.

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