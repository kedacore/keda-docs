+++
title = "External Scalers"
weight = 500
+++

While KEDA ships with a set of [built-in scalers](../scalers), users can also extend KEDA through a [GRPC](https://grpc.io) service that implements the same interface as the built-in scalers.

Built-in scalers run in the KEDA process/pod, while external scalers require an externally managed GRPC server that's accessible from KEDA with optional [TLS authentication](https://grpc.io/docs/guides/auth/). KEDA itself acts as a GRPC client and it exposes similar service interface for the built-in scalers, so external scalers can fully replace built-in ones.

This document describes the external scaler interfaces and how to implement them in Go, Node, and .NET; however for more details on GRPC refer to [the official GRPC documentation](https://grpc.io/docs/)

>Want to learn about existing external scalers? Explore our [external scaler community](https://github.com/kedacore/external-scalers).

## Overview

### Built-in scalers interface

Since external scalers mirror the interface of built-in scalers, it's worth becoming familiar with the Go `interface` that the built-in scalers implement:

```go
type Scaler interface {
	GetMetrics(ctx context.Context, metricName string, metricSelector labels.Selector) ([]external_metrics.ExternalMetricValue, error)
	GetMetricSpecForScaling() []v2beta2.MetricSpec
	IsActive(ctx context.Context) (bool, error)
	Close() error
}

type PushScaler interface {
	Scaler

	Run(ctx context.Context, active chan<- bool)
}
```

The `Scaler` interface defines 4 methods:

- `IsActive` is called on `pollingInterval`. When `isActive` returns `true`, KEDA will scale to what is returned by `GetMetricSpec` limited by `maxReplicaCount` on the ScaledObject/ScaledJob.
  When `false` is returned, KEDA will scale to `minReplicaCount` or optionally `idleReplicaCount`. More details around the defaults and how these options work together can be found on the [ScaledObjectSpec](https://keda.sh/docs/2.6/concepts/scaling-deployments/#scaledobject-spec).
- `Close` is called to allow the scaler to clean up connections or other resources.
- `GetMetricSpec` returns the target value for the HPA definition for the scaler. For more details refer to [Implementing `GetMetricSpec`](#5-implementing-getmetricspec).
- `GetMetrics` returns the value of the metric referred to from `GetMetricSpec`. For more details refer to [Implementing `GetMetrics`](#6-implementing-getmetrics).
> Refer to the [HPA docs](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/) for how HPA calculates `replicaCount` based on metric value and target value. KEDA supports both `AverageValue` and `Value` metric target types for external metrics. When `AverageValue` (the default metric type) is used, the metric value returned by the external scaler will be divided by the number of replicas.

The `PushScaler` interface adds a `Run` method. This method receives a push channel (`active`), on which the scaler can send `true` at any time. The purpose of this mechanism is to initiate a scaling operation independently from `pollingInterval`.

### External Scaler GRPC interface

KEDA comes with 2 external scalers [`external`](../scalers/external.md) and [`external-push`](../scalers/external-push.md).

The configuration in the ScaledObject points to a GRPC service endpoint that implements the [`externalscaler.proto`](https://github.com/kedacore/keda/blob/main/pkg/scalers/externalscaler/externalscaler.proto) GRPC contract:

```proto
service ExternalScaler {
    rpc IsActive(ScaledObjectRef) returns (IsActiveResponse) {}
    rpc StreamIsActive(ScaledObjectRef) returns (stream IsActiveResponse) {}
    rpc GetMetricSpec(ScaledObjectRef) returns (GetMetricSpecResponse) {}
    rpc GetMetrics(GetMetricsRequest) returns (GetMetricsResponse) {}
}
```

Much of this contract is similar to the built-in scalers:

- `GetMetrics` and `GetMetricsSpec` mirror their counterparts in the `Scaler` interface for creating HPA definition.
- `IsActive` maps to the `IsActive` method on the `Scaler` interface.
- `StreamIsActive` maps to the `Run` method on the `PushScaler` interface.

There are, however, some notable differences:

- There is no `Close` method. The scaler is expected to be functional throughout its lifetime.
- `IsActive`, `StreamIsActive`, and `GetMetricsSpec` are called with a `ScaledObjectRef` that contains the scaledObject name/namespace as well as the content of `metadata` defined in the trigger.

### Example

Given the following `ScaledObject`:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: scaledobject-name
  namespace: scaledobject-namespace
spec:
  scaleTargetRef:
    name: deployment-name
  triggers:
    - type: external-push
      metadata:
        scalerAddress: service-address.svc.local:9090
        key1: value1
        key2: value2
```

KEDA will attempt a GRPC connection to `service-address.svc.local:9090` immediately after reconciling the `ScaledObject`. It will then make the following RPC calls:

- `IsActive` - KEDA does an initial call to `IsActive` followed by one call on each `pollingInterval`
- `StreamIsActive` - KEDA does an initial call and the scaler is expected to maintain a long-lived connection (called a `stream` in GRPC terminology). The external push scaler can then send an `IsActive` event back to KEDA at any time. KEDA will only attempt another call to `StreamIsActive` if it needs to re-connect
- `GetMetricsSpec` - KEDA will do an initial call with the following data in the incoming `ScaledObjectRef` parameter:
- `GetMetrics` - KEDA will call this method every `pollingInterval` to get the point-in-time metric values for the names returned by `GetMetricsSpec`.

```json
{
  "name": "scaledobject-name",
  "namespace": "scaledobject-namespace",
  "scalerMetadata": {
    "scalerAddress": "service-address.svc.local:9090",
    "key1": "value1",
    "key2": "value2"
  }
}
```

>**Note**: KEDA will issue all of the above RPC calls except `StreamIsActive` if `spec.triggers.type` is `external`. It _must_ be `external-push` for `StreamIsActive` to be called.

## Implementing KEDA external scaler GRPC interface

### Implementing an external scaler

#### 1. Download [`externalscaler.proto`](https://github.com/kedacore/keda/blob/main/pkg/scalers/externalscaler/externalscaler.proto)

#### 2. Prepare project

{{< collapsible "Golang" >}}

2.1. Download [`./protoc`](https://github.com/protocolbuffers/protobuf/releases) for your platform

2.2. get `protoc-gen-go`

```bash
go get github.com/golang/protobuf/protoc-gen-go@v1.3.2
```

2.3. Prepare project

```bash
go mod init example.com/external-scaler/sample
mkdir externalscaler
protoc externalscaler.proto --go_out=plugins=grpc:externalscaler
```

{{< /collapsible >}}

{{< collapsible "C#" >}}
2.1. Create a new project

```bash
dotnet new console -o ExternalScalerSample
cd ExternalScalerSample

# add Grpc.AspNetCore
dotnet add package Grpc.AspNetCore
dotnet add package Newtonsoft.Json

# Create a Protos and Services folders
mkdir Protos
mkdir Services
```

2.2. Move `externalscaler.proto` to `Protos` folder

2.3. Compile `externalscaler.proto` using this in `ExternalScalerSample.csproj`

```xml
  <ItemGroup>
    <Protobuf Include="Protos\externalscaler.proto" GrpcServices="Server" />
  </ItemGroup>
```

{{< /collapsible >}}

{{< collapsible "Javascript" >}}
2.1. Prepare the project

```bash
npm install --save grpc request
```

{{< /collapsible >}}

<br />

#### 3. Implementing `IsActive`

Just like `IsActive(ctx context.Context) (bool, error)` in the go interface, the `IsActive` method in the GRPC interface is called every `pollingInterval` with a `ScaledObjectRef` object that contains the scaledObject name, namespace, and scaler metadata.

This section implements an external scaler that queries earthquakes from [earthquake.usgs.gov](https://earthquake.usgs.gov/) and scales the deployment if there has been more than 2 earthquakes with `magnitude > 1.0` around a particular longitude/latitude in the previous day.

Submit the following `ScaledObject` to tell KEDA to start making RPC calls to your external scaler (modifying appropriate fields as necessary):

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: scaledobject-name
  namespace: scaledobject-namespace
spec:
  scaleTargetRef:
    name: deployment-name
  triggers:
    - type: external
      metadata:
        scalerAddress: earthquake-scaler:9090
        longitude: "-122.335167"
        latitude: "47.608013"
```

{{< collapsible "Golang" >}}

The full implementation can be found at [github.com/kedacore/external-scaler-samples](https://github.com/kedacore/external-scaler-samples).

Put the following code into your `main.go` file:

```golang
func (e *ExternalScaler) IsActive(ctx context.Context, scaledObject *pb.ScaledObjectRef) (*pb.IsActiveResponse, error) {
	// request.Scalermetadata contains the `metadata` defined in the ScaledObject
	longitude := scaledObject.ScalerMetadata["longitude"]
	latitude := scaledObject.ScalerMetadata["latitude"]

	if len(longitude) == 0 || len(latitude) == 0 {
		return nil, status.Error(codes.InvalidArgument, "longitude and latitude must be specified")
	}

	startTime := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
	endTime := time.Now().Format("2006-01-02")
	radiusKM := 500
	query := fmt.Sprintf("format=geojson&starttime=%s&endtime=%s&longitude=%s&latitude=%s&maxradiuskm=%d", startTime, endTime, longitude, latitude, radiusKM)

	resp, err := http.Get(fmt.Sprintf("https://earthquake.usgs.gov/fdsnws/event/1/query?%s", query))
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	payload := USGSResponse{}
	err = json.Unmarshal(body, &payload)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	// count how many earthquakes with mag > 1.0
	count := 0
	for _, f := range payload.Features {
		if f.Properties.Mag > 1.0 {
			count++
		}
	}

	// return true if there is more than 2
	return &pb.IsActiveResponse{
		Result: count > 2,
	}, nil
}
```

{{< /collapsible >}}

{{< collapsible "C#" >}}

Full implementation can be found at [github.com/kedacore/external-scaler-samples](https://github.com/kedacore/external-scaler-samples).

Put the following code into your `Services/ExternalScalerService.cs` file:

```csharp
public class ExternalScalerService : ExternalScaler.ExternalScalerBase
{
  private static readonly HttpClient _client = new HttpClient();

  public override async Task<IsActiveResponse> IsActive(ScaledObjectRef request, ServerCallContext context)
  {
    // request.Scalermetadata contains the `metadata` defined in the ScaledObject
    if (!request.ScalerMetadata.ContainsKey("latitude") ||
      !request.ScalerMetadata.ContainsKey("longitude")) {
      throw new ArgumentException("longitude and latitude must be specified");
    }

    var longitude = request.ScalerMetadata["longitude"];
    var latitude = request.ScalerMetadata["latitude"];
    var startTime = DateTime.UtcNow.AddDays(-1).ToString("yyyy-MM-dd");
    var endTime = DateTime.UtcNow.ToString("yyyy-MM-dd");
    var radiusKm = 500;
    var query = $"format=geojson&starttime={startTime}&endtime={endTime}&longitude={longitude}&latitude={latitude}&maxradiuskm={radiusKm}";

    var resp = await _client.GetAsync($"https://earthquake.usgs.gov/fdsnws/event/1/query?{query}");
    resp.EnsureSuccessStatusCode();
    var payload = JsonConvert.DeserializeObject<USGSResponse>(await resp.Content.ReadAsStringAsync());

    return new IsActiveResponse
    {
      // return true if there is more than 2 Earthquakes with mag > 1.0
      Result = payload.features.Count(f => f.properties.mag > 1.0) > 2
    };
  }
}
```

{{< /collapsible >}}

{{< collapsible "Javascript" >}}

Put the following code into your `index.js` file:

```js
const grpc = require('grpc')
const request = require('request')
const externalScalerProto = grpc.load('externalscaler.proto')

const server = new grpc.Server()
server.addService(externalScalerProto.externalscaler.ExternalScaler.service, {
  isActive: (call, callback) => {
    const longitude = call.request.scalerMetadata.longitude
    const latitude = call.request.scalerMetadata.latitude
    if (!longitude || !latitude) {
      callback({
        code: grpc.status.INVALID_ARGUMENT,
        details: 'longitude and latitude must be specified',
      })
    } else {
      const now = new Date()
      const yesterday = new Date(new Date().setDate(new Date().getDate()-1));

      const startTime = `${yesterday.getUTCFullYear()}-${yesterday.getUTCMonth()}-${yesterday.getUTCDay()}`
      const endTime = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDay()}`
      const radiusKm = 500
      const query = `format=geojson&starttime=${startTime}&endtime=${endTime}&longitude=${longitude}&latitude=${latitude}&maxradiuskm=${radiusKm}`

      request.get({
        url: `https://earthquake.usgs.gov/fdsnws/event/1/query?${query}`,
        json: true,
      }, (err, resp, data) => {
        if (err) {
          callback({
            code: grpc.status.INTERNAL,
            details: err,
          })
        } else if (resp.statusCode !== 200) {
          callback({
            code: grpc.status.INTERNAL,
            details: `expected status 200, got ${resp.statusCode}`
          })
        } else {
          // count how many earthquakes with mag > 1.0
          let count = 0
          data.features.forEach(i => {
            if (i.properties.mag > 1.0) {
              count++
            }
          })
          callback(null, {
            result: count > 2,
          })
        }
      })
    }
  }
})

server.bind('127.0.0.1:9090', grpc.ServerCredentials.createInsecure())
console.log('Server listening on 127.0.0.1:9090')

server.start()
```

{{< /collapsible >}}

<br />

#### 4. Implementing `StreamIsActive`

Unlike `IsActive`, `StreamIsActive` is called once when KEDA reconciles the `ScaledObject`, and expects the external scaler to maintain a long-lived connection and push `IsActiveResponse` objects whenever the scaler needs KEDA to activate the deployment.

This implementation creates a timer and queries USGS APIs on that timer, effectively ignoring `pollingInterval` set in the scaledObject. Alternatively any other asynchronous event can be used instead of a timer, like an HTTP request, or a network connection.

{{< collapsible "Golang" >}}

```golang
func (e *ExternalScaler) StreamIsActive(scaledObject *pb.ScaledObjectRef, epsServer pb.ExternalScaler_StreamIsActiveServer) error {
	longitude := scaledObject.ScalerMetadata["longitude"]
	latitude := scaledObject.ScalerMetadata["latitude"]

	if len(longitude) == 0 || len(latitude) == 0 {
		return status.Error(codes.InvalidArgument, "longitude and latitude must be specified")
	}

	for {
		select {
		case <-epsServer.Context().Done():
			// call cancelled
			return nil
		case <-time.Tick(time.Hour * 1):
			earthquakeCount, err := getEarthQuakeCount(longitude, latitude)
			if err != nil {
				// log error
			} else if earthquakeCount > 2 {
				err = epsServer.Send(&pb.IsActiveResponse{
					Result: true,
				})
			}
		}
	}
}
```

{{< /collapsible >}}

{{< collapsible "C#" >}}

```csharp
public override async Task StreamIsActive(ScaledObjectRef request, IServerStreamWriter<IsActiveResponse> responseStream, ServerCallContext context)
{
  if (!request.ScalerMetadata.ContainsKey("latitude") ||
    !request.ScalerMetadata.ContainsKey("longitude"))
  {
    throw new ArgumentException("longitude and latitude must be specified");
  }

  var longitude = request.ScalerMetadata["longitude"];
  var latitude = request.ScalerMetadata["latitude"];
  var key = $"{longitude}|{latitude}";

  while (!context.CancellationToken.IsCancellationRequested)
  {
    var earthquakeCount = await GetEarthQuakeCount(longitude, latitude);
    if (earthquakeCount > 2) {
      await responseStream.WriteAsync(new IsActiveResponse
      {
        Result = true
      });
    }

    await Task.Delay(TimeSpan.FromHours(1));
  }
}
```

{{< /collapsible >}}

{{< collapsible "Javascript" >}}

```js
server.addService(externalScalerProto.externalscaler.ExternalScaler.service, {
  // ...
  streamIsActive: (call, callback) => {
    const longitude = call.request.scalerMetadata.longitude
    const latitude = call.request.scalerMetadata.latitude
    if (!longitude || !latitude) {
      callback({
        code: grpc.status.INVALID_ARGUMENT,
        details: 'longitude and latitude must be specified',
      })
    } else {
      const interval = setInterval(() => {
        getEarthquakeCount((err, count) => {
          if (err) {
            console.error(err)
          } else if (count > 2) {
            call.write({
              result: true,
            })
          }
        })
      }, 1000 * 60 * 60);

      call.on('end', () => {
        clearInterval(interval)
      })
    }
  }
})
```

{{< /collapsible >}}

<br />

#### 5. Implementing `GetMetricSpec`

`GetMetricSpec` returns the `target` value for [the HPA definition for the scaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/). This scaler will define a static target of 10, but the threshold value is often specified in the metadata for other scalers.

{{< collapsible "Golang" >}}

```golang
func (e *ExternalScaler) GetMetricSpec(context.Context, *pb.ScaledObjectRef) (*pb.GetMetricSpecResponse, error) {
	return &pb.GetMetricSpecResponse{
		MetricSpecs: []*pb.MetricSpec{{
			MetricName: "earthquakeThreshold",
			TargetSize: 10,
		}},
	}, nil
}
```

{{< /collapsible >}}

{{< collapsible "C#" >}}

```csharp
public override async Task<GetMetricSpecResponse> GetMetricSpec(ScaledObjectRef request, ServerCallContext context)
{
  var resp = new GetMetricSpecResponse();

  resp.MetricSpecs.Add(new MetricSpec
  {
    MetricName = "earthquakeThreshold",
    TargetSize = 10
  });

  return Task.FromResult(resp);
}
```

{{< /collapsible >}}

{{< collapsible "Javascript" >}}

```js
server.addService(externalScalerProto.externalscaler.ExternalScaler.service, {
  // ...
  getMetricSpec: (call, callback) => {
    callback(null, {
      metricSpecs: [{
        metricName: 'earthquakeThreshold',
        targetSize: 10,
      }]
    })
  }
})
```

{{< /collapsible >}}

<br />

#### 6. Implementing `GetMetrics`

`GetMetrics` returns the value of the metric referred to from `GetMetricSpec`, in this example it's `earthquakeThreshold`.

{{< collapsible "Golang" >}}

```golang
func (e *ExternalScaler) GetMetrics(_ context.Context, metricRequest *pb.GetMetricsRequest) (*pb.GetMetricsResponse, error) {
	longitude := metricRequest.ScaledObjectRef.ScalerMetadata["longitude"]
	latitude := metricRequest.ScaledObjectRef.ScalerMetadata["latitude"]

	if len(longitude) == 0 || len(latitude) == 0 {
		return nil, status.Error(codes.InvalidArgument, "longitude and latitude must be specified")
	}

	earthquakeCount, err := getEarthQuakeCount(longitude, latitude, 1.0)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &pb.GetMetricsResponse{
		MetricValues: []*pb.MetricValue{{
			MetricName: "earthquakeThreshold",
			MetricValue: int64(earthquakeCount),
		}},
	}, nil
}
```

{{< /collapsible >}}

{{< collapsible "C#" >}}

```csharp
public override async Task<GetMetricsResponse> GetMetrics(GetMetricsRequest request, ServerCallContext context)
{
  if (!request.ScaledObjectRef.ScalerMetadata.ContainsKey("latitude") ||
    !request.ScaledObjectRef.ScalerMetadata.ContainsKey("longitude"))
  {
    throw new ArgumentException("longitude and latitude must be specified");
  }

  var longitude = request.ScaledObjectRef.ScalerMetadata["longitude"];
  var latitude = request.ScaledObjectRef.ScalerMetadata["latitude"];

  var earthquakeCount = await GetEarthQuakeCount(longitude, latitude);

  var resp = new GetMetricsResponse();
  resp.MetricValues.Add(new MetricValue
  {
    MetricName = "earthquakeThreshold",
    MetricValue_ = earthquakeCount
  });

  return resp;
}
```

{{< /collapsible >}}

{{< collapsible "Javascript" >}}

```js
server.addService(externalScalerProto.externalscaler.ExternalScaler.service, {
  // ...
  getMetrics: (call, callback) => {
    const longitude = call.request.scaledObjectRef.scalerMetadata.longitude
    const latitude = call.request.scaledObjectRef.scalerMetadata.latitude
    if (!longitude || !latitude) {
      callback({
        code: grpc.status.INVALID_ARGUMENT,
        details: 'longitude and latitude must be specified',
      })
    } else {
      getEarthquakeCount((err, count) => {
        if (err) {
          callback({
            code: grpc.status.INTERNAL,
            details: err,
          })
        } else {
          callback(null, {
            metricValues: [{
              metricName: 'earthquakeThreshold',
              metricValue: count,
            }]
          })
        }
      })
    }
  }
})
```

{{< /collapsible >}}
