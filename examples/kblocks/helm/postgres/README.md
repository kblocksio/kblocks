# Postgres
A custom resource for configuring a PostgreSQL database within a Kubernetes cluster.

## Options
This resource does not require any specific configuration fields. All fields are at the **root** of the resource.

## Examples in Kubernetes Manifests
### Example: Basic Postgres Instance
```yaml
apiVersion: acme.com/v1
kind: Postgres
metadata:
  name: my-postgres
```

## Resources
The creation of a `Postgres` custom resource generates the following Kubernetes resources:
- `<release-name>-postgresql`
  - A `Service` for database access
  - A `Secret` for storing database credentials

## Behavior
The Postgres resource is managed using a Helm chart. When the custom resource is deployed, the Kblocks controller ensures that the state of the cluster matches the desired specification indicated in the custom resource. This process involves converting the resource fields into Helm 'values' for managing the deployment of PostgreSQL. The resources created are directly tracked and associated with the parent custom resource.