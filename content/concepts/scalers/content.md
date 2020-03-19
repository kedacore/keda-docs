+++
fragment = "content"
weight = 100

title = "Scalers"

[sidebar]
  sticky = true
+++

## Overview

Each event source has unique characteristics on how KEDA needs to connect to it and the types of metrics available to drive scaling.  KEDA is made up of many *scalers*, or simple extensions to the core KEDA operator that allows it to connect to an event source.  The full list of supported scalers can [be found here](/#scalers).

Scalers are shipped with KEDA in two ways.  They can be packaged up and merged into the core KEDA operator, or can they can external processes or pods that KEDA can communicate with to drive scale.  Scalers that are packaged as part of the KEDA operator must be written as Go modules.  External scalers can be written in any language.

## Contributing

One of the easiest ways many people begin contributing to KEDA is by adding new event sources through scalers.  Below is guidance and recommendations when creating a scaler.

### Building core or external scalers

When building a scaler you'll need to determine if the scaler should be a core scaler shipped with every KEDA operator, or an external scaler that can be deployed and discovered independent of the core operator.  In general if you are building a scaler that connects to a popular event source, you should write them as core scalers in the `kedacore/keda` repo.  However, an external scaler may be a better fit if your scaler has one or many of the below characteristics.

* Written in a language other than Go
* Connects to an event source that is specific to a small set of users
* Needs to be versioned or governed separately from the core operator

## Support and Maintenance

The core KEDA team and maintainers are responsible primarily for the KEDA operator.  Each scaler has an identified maintainer or sponsor responsible for scaler upkeep.  By default scalers are maintained with the designation **community**.  This means no direct organization or individual is accountable for bug fixes and upkeep.  Issues can and should still be filed, but the community will make a best effort to apply fixes.  If it's deemed by the community and maintainers that a scaler is no longer functioning properly, it may be removed from future releases.

Any scaler can be submitted for sponsorship and maintainers by an organization or individual.  Maintaining a scaler means that as bugs and issues are filed, the maintainer of the scaler will be notified and it's expected issues will be triaged and acted on as appropriate by the maintainer.  If a maintainer becomes unresponsive or unreachable for an extended period of time, a scaler may be moved back to the **community** designation.

If you or your organization are interested in maintaining a scaler, please create an issue in the `kedacore/keda` repo, including the GitHub IDs for individuals to tag in scaler issues.  After being accepted as a scaler maintainer you can open up a pull request on `kedacore/keda-docs` to list yourself as a maintainer visible to the entire community.

For any questions or issues on creating or maintaining scalers, feel free to create a GitHub issue or reach out to the community via Slack.