+++
title = "Why does KEDA operator error with NoCredentialProviders"
+++

If you are running KEDA on AWS using IRSA or KIAM for pod identity and seeing the following error messages:

```
Events:
  Type     Reason                      Age                From           Message
  ----     ------                      ----               ----           -------
  Normal   KEDAScalersStarted          31s                keda-operator  Started scalers watch
  Normal   KEDAScaleTargetDeactivated  31s                keda-operator  Deactivated apps/v1.Deployment default/my-event-based-deployment from 1 to 0
  Normal   ScaledObjectReady           13s (x2 over 31s)  keda-operator  ScaledObject is ready for scaling
  Warning  KEDAScalerFailed            1s (x2 over 31s)   keda-operator  NoCredentialProviders: no valid providers in chain. Deprecated.
           For verbose messaging see aws.Config.CredentialsChainVerboseErrors
```

And the operator logs:

```
2021-11-02T23:50:29.688Z    ERROR    controller    Reconciler error    {"reconcilerGroup": "keda.sh", "reconcilerKind": "ScaledObject", "controller": "scaledobject", "name": "my-event-based-deployment-scaledobject", "namespace": "default"
, "error": "error getting scaler for trigger #0: error parsing SQS queue metadata: awsAccessKeyID not found"}
```

This means hat the KEDA operator is not receiving valid credentials, even before attempting to assume the IAM role associated with the `scaleTargetRef`.

Some things to check:

- Ensure the `keda-operator` deployment has the `iam.amazonaws.com/role` annotation under `deployment.spec.template.metadata` not `deployment.metadata` - if using KIAM
- Ensure the `keda-operator` serviceAccount is annotated `eks.amazonaws.com/role-arn` - if using IRSA
- Check `kiam-server` logs, successful provisioning of credentials looks like:
`kube-system kiam-server-6bb67587bd-2f47p kiam-server {"level":"info","msg":"found role","pod.iam.role":"arn:aws:iam::1234567890:role/my-service-role","pod.ip":"100.64.7.52","time":"2021-11-05T03:13:34Z"}`.
  - Use `grep` to filter the `kiam-server` logs, searching for the `keda-operator` pod ip.
