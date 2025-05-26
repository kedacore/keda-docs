+++
title = "Weather-Aware Demand"
availability = "v2.18.0+"
maintainer = "Community"
category = "Data & Storage"
description = "Scale applications based on weather conditions and demand patterns"
go_file = "weather_aware_demand_scaler"
+++

### Trigger Specification

This specification describes the `weather-aware-demand` trigger that allows KEDA to scale applications based on real-time weather conditions and demand patterns.

```yaml
triggers:
- type: weather-aware-demand
  metadata:
    # Weather API Configuration
    weatherApiEndpoint: "https://api.openweathermap.org/data/2.5/weather"  # Optional: Weather API endpoint
    weatherApiKeyFromEnv: "WEATHER_API_KEY"                                 # Optional: Environment variable containing weather API key
    weatherLocation: "New York,US"                                          # Optional: Location for weather data (city,country or lat,lon)
    weatherUnits: "metric"                                                   # Optional: Units for weather data (metric/imperial, default: metric)
    badWeatherConditions: "temp_below:0,rain_above:5,wind_above:10"         # Optional: Conditions that trigger weather scaling

    # Demand API Configuration  
    demandApiEndpoint: "https://api.example.com/demand"                     # Optional: Demand API endpoint
    demandApiKeyFromEnv: "DEMAND_API_KEY"                                   # Optional: Environment variable containing demand API key
    demandJsonPath: "{.current_demand}"                                     # Optional: JSONPath to extract demand value

    # Scaling Configuration
    targetDemandPerReplica: "100"                                           # Optional: Target demand per replica (default: 100)
    activationDemandLevel: "10"                                             # Optional: Minimum demand to activate scaling (default: 10)
    weatherEffectScaleFactor: "1.5"                                         # Optional: Scale factor during bad weather (default: 1.0)
    metricName: "weather-aware-demand"                                       # Optional: Custom metric name (default: weather-aware-ride-demand)
```

**Parameter list:**

- `weatherApiEndpoint` - Weather API endpoint URL. If not provided, weather conditions are not considered.
- `weatherApiKeyFromEnv` - Environment variable name containing the weather API key for authentication.
- `weatherLocation` - Location for weather data in format "city,country" or "latitude,longitude".
- `weatherUnits` - Units for weather measurements. Options: `metric` (Celsius, km/h, mm) or `imperial` (Fahrenheit, mph, inches). (Default: `metric`)
- `badWeatherConditions` - Comma-separated conditions that trigger increased scaling. Format: `condition_type:threshold`. Examples: `temp_below:0`, `rain_above:5`, `wind_above:10`.
- `demandApiEndpoint` - API endpoint that provides current demand metrics. If not provided, demand defaults to 0.
- `demandApiKeyFromEnv` - Environment variable name containing the demand API key for authentication.
- `demandJsonPath` - JSONPath expression to extract demand value from API response. Examples: `{.current_demand}`, `{.metrics.active_requests}`.
- `targetDemandPerReplica` - Target demand value per replica. Higher values result in fewer replicas. (Default: `100`)
- `activationDemandLevel` - Minimum demand level to activate scaling. Below this threshold, the scaler is inactive. (Default: `10`)
- `weatherEffectScaleFactor` - Multiplier applied to demand during bad weather conditions. Values > 1.0 increase perceived demand. (Default: `1.0`)
- `metricName` - Custom name for the metric. Useful when multiple weather-aware scalers are used. (Default: `weather-aware-ride-demand`)

### Authentication Parameters

You can use `TriggerAuthentication` CRD to configure the authentication by providing the API keys:

**Weather API Key:**
- `weatherApiKey` - Weather API key for authentication

**Demand API Key:**
- `demandApiKey` - Demand API key for authentication

### Example

#### Basic Weather and Demand Scaling

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: weather-demand-secret
data:
  weather-api-key: <base64-encoded-weather-api-key>
  demand-api-key: <base64-encoded-demand-api-key>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: weather-demand-auth
spec:
  secretTargetRef:
  - parameter: weatherApiKey
    name: weather-demand-secret
    key: weather-api-key
  - parameter: demandApiKey
    name: weather-demand-secret
    key: demand-api-key
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: weather-aware-app
spec:
  scaleTargetRef:
    name: delivery-app
  minReplicaCount: 1
  maxReplicaCount: 20
  triggers:
  - type: weather-aware-demand
    metadata:
      weatherApiEndpoint: "https://api.openweathermap.org/data/2.5/weather"
      weatherApiKeyFromEnv: "WEATHER_API_KEY"
      weatherLocation: "New York,US"
      weatherUnits: "metric"
      badWeatherConditions: "temp_below:0,rain_above:5,wind_above:15"
      demandApiEndpoint: "https://api.delivery-company.com/metrics/demand"
      demandApiKeyFromEnv: "DEMAND_API_KEY"
      demandJsonPath: "{.current_orders}"
      targetDemandPerReplica: "50"
      activationDemandLevel: "5"
      weatherEffectScaleFactor: "1.8"
    authenticationRef:
      name: weather-demand-auth
```

#### Weather-Only Scaling

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: heating-system
spec:
  scaleTargetRef:
    name: heating-controllers
  minReplicaCount: 1
  maxReplicaCount: 10
  triggers:
  - type: weather-aware-demand
    metadata:
      weatherApiEndpoint: "https://api.weatherapi.com/v1/current.json"
      weatherApiKeyFromEnv: "WEATHER_API_KEY"
      weatherLocation: "Chicago,US"
      badWeatherConditions: "temp_below:-10"
      targetDemandPerReplica: "1"
      activationDemandLevel: "1"
      weatherEffectScaleFactor: "3.0"
      metricName: "cold-weather-heating-demand"
    authenticationRef:
      name: weather-auth
```

#### Demand-Only Scaling

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: api-backend
spec:
  scaleTargetRef:
    name: api-service
  minReplicaCount: 2
  maxReplicaCount: 50
  triggers:
  - type: weather-aware-demand
    metadata:
      demandApiEndpoint: "https://metrics.mycompany.com/api/requests"
      demandApiKeyFromEnv: "METRICS_API_KEY"
      demandJsonPath: "{.metrics.active_requests}"
      targetDemandPerReplica: "100"
      activationDemandLevel: "20"
      metricName: "api-request-demand"
    authenticationRef:
      name: metrics-auth
```

### Use Cases

The weather-aware demand scaler is particularly useful for applications that experience demand fluctuations correlated with weather patterns:

1. **Delivery and Logistics**: Scale delivery fleet management systems during bad weather when order volumes typically increase.

2. **Energy Management**: Scale heating/cooling control systems based on temperature extremes.

3. **Transportation Services**: Scale ride-sharing or public transit applications during weather events that affect travel patterns.

4. **IoT and Monitoring**: Scale data processing systems that handle increased sensor data during weather events.

5. **Tourism and Hospitality**: Scale booking and reservation systems that see demand changes due to weather conditions.

6. **E-commerce**: Scale order processing systems during weather events that drive online shopping.

### Weather Condition Format

The `badWeatherConditions` parameter accepts comma-separated conditions in the format `type_operator:threshold`:

- **Temperature**: `temp_below:0` (temperature below 0°C/32°F), `temp_above:35` (temperature above 35°C/95°F)
- **Precipitation**: `rain_above:5` (rainfall above 5mm/0.2in per hour)
- **Wind**: `wind_above:10` (wind speed above 10 km/h or mph depending on units)

Multiple conditions can be combined: `temp_below:0,rain_above:2,wind_above:15`

### Scaling Logic

The scaler works as follows:

1. **Fetch Demand**: Retrieves current demand from the configured API endpoint
2. **Fetch Weather**: Retrieves current weather conditions from the weather API
3. **Evaluate Conditions**: Checks if current weather matches any bad weather conditions
4. **Apply Weather Effect**: If bad weather is detected, multiplies demand by `weatherEffectScaleFactor`
5. **Calculate Replicas**: Divides adjusted demand by `targetDemandPerReplica` to determine target replica count
6. **Activation Check**: Scaler is active only if adjusted demand exceeds `activationDemandLevel`

### Notes

- Both weather and demand APIs are optional. You can use either one or both.
- API keys should be stored securely using Kubernetes Secrets and TriggerAuthentication.
- Weather conditions are evaluated using "OR" logic - any matching condition triggers the weather effect.
- The scaler respects the standard KEDA `minReplicaCount` and `maxReplicaCount` settings.
- Metric names are automatically normalized and prefixed with trigger index for uniqueness. 