# Postgres

This custom resource represents a PostgreSQL database configuration within a Kubernetes cluster.

## Usage

### Example: Basic Postgres Instance

This example creates a basic PostgreSQL instance.

```yaml
apiVersion: acme.com/v1
kind: Postgres
metadata:
  name: my-postgres
```

## Configuration

The configuration schema for this CRD does not define any specific properties. All fields are at the **root** of the resource, and not under `spec`.

## Outputs

The custom resource provides the following outputs which can be referenced from other kblocks:

- `host`: The hostname of the PostgreSQL database.
- `user`: The username for accessing the database.
- `database`: The name of the PostgreSQL database.
- `port`: The port on which the database is accessible, default is `5432`.
- `passwordSecret`: The Kubernetes secret where the database password is stored.
- `passwordKey`: The key within the password secret that contains the password.

These fields will be available under the `status` subresource of the custom resource and can also be referenced from other kblocks through `${ref://Postgres.acme.com/<name>/<field>}`.

## Resources

When a `Postgres` custom resource is created, the following Kubernetes child resources are generated and tracked:

- `<release-name>-postgresql`
  - Service for database access
  - Secret containing database credentials

## Behavior

The resource is implemented through a Helm chart, which consists of templates and values used to generate Kubernetes manifests. When the resource is applied to the cluster, the Kblocks controller reconciles the state of the cluster with the desired state specified in the custom resource definition. The object is converted into Helm 'values' to manage the PostgreSQL deployment. The resources created by this process are associated with the parent custom resource and tracked accordingly.