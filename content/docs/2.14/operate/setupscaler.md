+++
title = "Setup Autoscaling with KEDA"
weight = 500
description = "Procedure to Setup a Autoscaling with KEDA"
+++

## Prerequisites

1. **Kubernetes Cluster**:
   - Ensure you have a running Kubernetes cluster set up and accessible.
   - If you don't have a cluster yet, follow the [official Kubernetes documentation](https://kubernetes.io/docs/setup/) to create a new cluster suitable for your environment (local machine, cloud provider, etc.).

2. **KEDA Installation**:
   - KEDA needs to be installed on your Kubernetes cluster before you can use it.
   - Follow the [KEDA installation guide](https://keda.sh/docs/2.14/deploy/) carefully, including any prerequisites specific to your Kubernetes setup.
   - The installation guide provides instructions for different installation methods (e.g., YAML, Helm charts, etc.). Choose the method that suits your needs.

3. **kubectl**:
   - The `kubectl` command-line tool is required to interact with your Kubernetes cluster.
   - Follow the [official kubectl installation guide](https://kubernetes.io/docs/tasks/tools/#kubectl) to install `kubectl` on your operating system.
   - Once installed, configure `kubectl` to communicate with your Kubernetes cluster by following the cluster-specific instructions provided by your Kubernetes setup.

## Step 1: Identify the Scaler You Need

KEDA supports various scalers that correspond to different event sources or triggers. Determining the right scaler is crucial for scaling your application based on the desired event source.

1. Visit the [KEDA Scalers documentation](https://keda.sh/docs/2.14/scalers/) and browse through the list of available scalers.
2. Identify the scaler that matches the event source you want to use for scaling your application. For example:
   - If you want to scale based on incoming HTTP traffic, you would need the **HTTP Add-on**.

     > **Note:**
     > The HTTP Add-on is still in beta stage and may not provide the full functionality or stability expected in a production environment.

   - If you want to scale based on messages in a RabbitMQ queue, you would need the **RabbitMQ scaler**.
   - If you want to scale based on a cron schedule, you would need the **Cron scaler**.
3. Open the documentation page for your chosen scaler and familiarize yourself with its specific requirements and configuration options.

## Step 2: Install the Required Scaler (if needed)

Some scalers are part of the core KEDA installation, while others need to be installed separately as add-ons.

1. Refer to the documentation of your chosen scaler to check if it needs to be installed separately.
2. If the scaler needs to be installed separately, follow the installation instructions provided in the scaler's documentation carefully.
   - The installation process typically involves running a command (e.g., `helm install` for Helm charts) or applying YAML manifests using `kubectl`.
3. Verify that the scaler has been installed successfully by checking the output of the installation process or by running any provided verification commands.

## Step 3: Create a ScaledObject Configuration File

KEDA uses a custom resource called `ScaledObject` to define how your application should be scaled based on the chosen event source or trigger.

1. Create a new file (e.g., `scaledobject.yaml`) in a text editor or using the command line.
2. Define the `ScaledObject` configuration in this file, following the structure and examples provided in the documentation of your chosen scaler.
3. Typically, the `ScaledObject` configuration includes the following sections:
   - `metadata`: Specifies the name and namespace for the `ScaledObject`.
   - `spec.scaleTargetRef`: Identifies the Kubernetes deployment or other resource that should be scaled.
   - `spec.pollingInterval` (optional): Specifies how often KEDA should check for scaling events (defaults to 15 seconds).
   - `spec.cooldownPeriod` (optional): Specifies the cool-down period in seconds after a scaling event (defaults to 300 seconds).
   - `spec.maxReplicaCount` (optional): Specifies the maximum number of replicas to scale up to (defaults to 100).
   - `spec.triggers`: Defines the specific configuration for your chosen scaler, including any required parameters or settings.
4. Refer to the scaler's documentation for detailed explanations and examples of the `triggers` section and any other required or optional configuration settings.
5. Save the `scaledobject.yaml` file after making the necessary modifications.

## Step 4: Apply the ScaledObject Configuration

Once you have created the `ScaledObject` configuration file, apply it to your Kubernetes cluster using `kubectl`:

1. Open a terminal or command prompt and navigate to the directory containing the `scaledobject.yaml` file.
2. Run the following command to apply the `ScaledObject` configuration:

   ```bash
   kubectl apply -f scaledobject.yaml
   ```

   ```plaintext
   scaledobject.keda.sh/<scaled-object-name> created
   ```

3. Verify that the `ScaledObject` has been created successfully by running:

   ```bash
   kubectl get scaledobjects
   ```

   This should display the `ScaledObject` you just created.

   ```plaintext
   NAME              SCALETARGETKIND   SCALETARGETNAME   MIN   MAX   TRIGGERS   AUTHENTICATION   READY   ACTIVE   FALLBACK   AGE
   <scaled-object-name>   Deployment        <deployment-name>   1     10    cpu                    <none>            True    False    <none>      10s
   ```

After applying the `ScaledObject` configuration, KEDA will start monitoring the specified event source and scale your application accordingly, based on the configurations you provided.

## Step 5: Monitor Scaling Events

You can monitor the scaling events and logs generated by KEDA using the following commands:

1. List all `ScaledObjects` in your cluster:

   ```bash
   kubectl get scaledobjects
   ```

   This will show you the current state of your `ScaledObject` and the number of replicas.

   ```plaintext
   NAME              SCALETARGETKIND   SCALETARGETNAME   MIN   MAX   TRIGGERS   AUTHENTICATION   READY   ACTIVE   FALLBACK   AGE
   <scaled-object-name>   Deployment        <deployment-name>   1     10    cpu                    <none>            True    False    <none>      10s
   ```

2. View the logs of the KEDA operator:

   ```bash
   kubectl logs -n keda -l app=keda-operator
   ```

   The KEDA operator logs will show you detailed information about scaling events, decisions made by KEDA based on the event source, and any errors or warnings.

   ```plaintext
   {"level":"info","ts":<timestamp>,"logger":"scalehandler","msg":"Successfully scaled deployment","scaledobject.Namespace":"<namespace>","scaledobject.Name":"<scaled-object-name>","scaler":<scaler-type>}
   ```
