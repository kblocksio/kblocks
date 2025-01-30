# Redis
This custom resource represents a Redis database configuration within a Kubernetes cluster, allowing deployment and management of Redis instances.

## Options
This resource does not have any specific configurable fields defined within its schema. The options for configuring the Redis instance are managed internally by the Helm chart associated with the resource.

## Examples in Kubernetes Manifests

### Example: Basic Redis Instance
```yaml
apiVersion: acme.com/v1
kind: Redis
metadata:
  name: my-redis
```
This example creates a basic Redis instance with default settings.

## Resources
When a `Redis` custom resource is created, the following Kubernetes child resources are generated:
- `<release-name>-redis`: A Service for database access.
- Secret containing database credentials.

## Behavior
The Redis resource is realized via a Helm chart, translating the resource configuration into a set of Kubernetes resources that deploy and maintain a Redis instance. When applied, the Kblocks controller ensures actual cluster state matches the specified configuration, managing the Redis deployment using Helm values derived from the custom resource.