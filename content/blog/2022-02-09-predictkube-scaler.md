+++
title = "Introducing PredictKube - an AI-based predictive autoscaler for KEDA made by Dysnix"
date = 2022-02-09
author = "Daniel Yavorovych (Dysnix), Yuriy Khoma (Dysnix), Zbynek Roubalik (KEDA), Tom Kerkhove (KEDA)"
aliases = [
"/blog/introducing-predictkube-for-keda-by-dysnix"
]
+++

## Introducing PredictKube—an AI-based predictive autoscaler for KEDA made by Dysnix

[Dysnix](https://dysnix.com/) has been working with high-traffic backend systems for a long time,
and the efficient scaling demand is what their team comes across each day.
The engineers have understood that manually dealing with traffic fluctuations and preparations of infrastructure is
inefficient because you need to deploy more resources _before_ the traffic increases,
not at the moment the event happens. This strategy is problematic for two reasons: first, because it's often too late to scale when traffic has already arrived and second, resources will be overprovisioned and idle during the times that traffic isn't present.

And when it comes to deciding how to wrap up this solution, Dysnix decided to rely on KEDA as it is the most
universal and applicable component for application autoscaling in Kubernetes.

KEDA is being used as a component on the client side of PredictKube that is responsible for transferring requests
and scaling replicas.

## Dysnix's PredictKube integrates with KEDA

Dysnix has built [PredictKube](https://predictkube.com/), a solution that can be used as a KEDA scaler that
is responsible for resource balancing, and an AI model that has learned to react proactively to patterns of traffic activity,
to help with both in-time scaling and solving the problem of overprovision.

![Overprovision](/img/blog/predictkube-scaler/overprovision.png "Overprovision")

The predictive autoscaling process is possible thanks to an AI model that observes the requests-per-second (RPS)
or CPU values for a period of time during a project and then shows the trend for up to 6 hours.
PredictKube used customer and open data sources (we used data sets like [HTTP NASA logs](ftp://ita.ee.lbl.gov/html/contrib/NASA-HTTP.html)) to train the model and be specific about the cloud data and traffic trends.

With this tool, Dysnix wants to decrease costs on the projects, analyze the data about traffic more efficiently,
use cloud resources more responsibly, and build infrastructures that are &quot;greener&quot; and more performative
(with fewer downtimes and delays) than others.

## How does PredictKube work?

PredictKube works in two parts:

1. **On the KEDA side**
   The interface connects via API to the data sources about your traffic.
   PredictKube uses [Prometheus](https://prometheus.io/)—the industry standard for storing metrics.
   There, it anonymizes the data about the traffic on the client's side before sending it to the API,
   where the model then works with information that is completely impersonal.
2. **On the AI model side**
   Next, it is linked with a prediction mechanism—the AI model starts to get data about things that happen in
   your cloud project. Unlike standard rules-based algorithms such as Horizontal Pod Autoscaling (HPA),
   PredictKube uses Machine Learning models for time series data predicting, like CPU or RPS metrics.

The more data you can provide to it from the start, the more precise the prediction will be. The 2+ weeks data will be enough for the beginning.

![PredictKube Scaler Diagram](/img/blog/predictkube-scaler/diagram.png)

The rest is up to you! You can visualize the trend of prediction in, for example, [Grafana](https://grafana.com/).

## Launch of PredictKube

1. [Install KEDA](https://keda.sh/docs/latest/deploy/)
2. Get PredictKube API Key
- Go to the [PredictKube website](https://predictkube.com/)
- Register to get the API key in your email
3. Create PredictKube Credentials secret[​](https://docs.predictkube.com/quickstart-with-keda#create-predictkube-credentials-secret)

```bash
API_KEY="<change-me>"
$ kubectl create secret generic predictkube-secrets --from-literal=apiKey=${API_KEY}
```

4. Configure Predict Autoscaling[​](https://docs.predictkube.com/quickstart-with-keda#configure-predict-autoscaling)

```yml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: keda-trigger-auth-predictkube-secret
spec:
  secretTargetRef:
  - parameter: apiKey
    name: predictkube-secrets
    key: apiKey
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: example
spec:
  scaleTargetRef:
    name: example-app
  pollingInterval: 60
  cooldownPeriod: 300
  minReplicaCount: 3
  maxReplicaCount: 50
  triggers:
  - type: predictkube
    metadata:
      predictHorizon: "2h"
      historyTimeWindow: "7d"  # We recommend using a minimum of a 7-14 day time window as historical data
      prometheusAddress: http://kube-prometheus-stack-prometheus.monitoring:9090
      query: sum(irate(http_requests_total{pod=~"example-app-.*"}[2m]))
      queryStep: "2m" # Note: query step duration for range prometheus queries
      threshold: '2000' # Value to start scaling for
    authenticationRef:
      name: keda-trigger-auth-predictkube-secret
```


5. Check the status and get stats[​](https://docs.predictkube.com/quickstart-with-keda#get-stats)

To check the configuration and status of the scaling created in the previous step, use the following command:

```bash
$ kubectl get scaledobject example
```

To get stats to use for the scaling, use the following command:

```bash
$ kubectl get hpa example
```

Now you can look at how scaling works at a graph in your visualization tool.
This is an example of a graph Dysnix gets in one of their projects after using PredictKube:

![Grafana dashboard](/img/blog/predictkube-scaler/grafana.png "Grafana dashboard")

On this graph, you'll see the graphs of stats for the environment with 2 hours cooldown period.
The green trend shows predicted replicas number, a yellow one—ready replicas at a certain moment,
and the ideal—the blue trend—showing the closest replicas number covering the RPS trend.
If you need a template of such a dashboard to make your own, feel free to contact [Daniel](https://github.com/daniel-yavorovich) to get one.

After everything is connected and deployed, you'll be able to change the time frame you're observing or just monitor the data as it comes.

## What's next?

With this release, Dysnix has created the first milestone of predictive autoscaling for Kubernetes workloads.
The team hopes you'll find it interesting and help to test it and improve it.
If you have any questions to ask about the core functionality of PredictKube,
you may contact the developers' team [here](https://predictkube.com/contact).
And for all KEDA-related issues, share your feedback [via GitHub](https://github.com/kedacore/keda/discussions/2605).

In the future, PredictKube plans to add more integrations with other data sources to autoscale
based on other configurations of the projects. Also, there is an idea for implementing
an event-based predictive scaling to make it possible to react on not only a trend but event appearance.

You can contact the Dysnix team with any questions concerning the mechanics of PredictKube
or learn more about the data usage in its [privacy policy](https://predictkube.com/privacy-policy).
The following people will be happy to help:

- [Daniel Yavorovych](https://github.com/daniel-yavorovich) — KEDA integration and Kubernetes-related questions;
- [Yurij Khoma](https://www.linkedin.com/in/yuriy-khoma-5657a461/) — can comment more about the AI model that was created.

Thanks for reading,

Daniel Yavorovych and Yuriy Khoma on behalf of the PredictKube developers team.
