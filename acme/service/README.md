# Service

A Kubernetes custom resource definition (CRD) for managing services associated with GitHub repositories.

## Usage

### Example: Basic Service

Create a basic service resource for a public GitHub repository.

```yaml
apiVersion: acme.com/v1
kind: Service
metadata:
  name: my-service

repo:
  name: sample-repo
  owner: sample-org
```

### Example: Service with Config Repository

Create a service resource with a config-only repository.

```yaml
apiVersion: acme.com/v1
kind: Service
metadata:
  name: my-config-service

repo:
  name: config-repo
  owner: sample-org
configOnly: true
```

## Configuration

- `repo` (object): The repository to create the service for.
  - `name` (string): The name of the GitHub repository.
  - `owner` (string): The organization or user that owns the GitHub repository.
  - `public` (boolean): Whether the repository is public or not. Default: true.
- `configOnly` (boolean): Whether to create a config-only repository (without a Dockerfile). Default: false.

## Resources

The custom resource creates several Kubernetes objects:

- **Service repository** (Repository): Managed by the `Service` object.
- **ArgoCD Application** (Application): Deployed to the `argocd` namespace and synchronizes the repository to the cluster.
- **ArgoCD ApplicationSet** (ApplicationSet): For managing pull requests connected to the service repository.
- **ArgoCD Secret** (Secret): For GitHub authentication, stored in the `argocd` namespace.

## Behavior

The `Service` custom resource is implemented by creating a Wing object with the name `Service` and synthesizing it into Kubernetes manifests. Upon applying the resource, the Kblocks controller reconciles the cluster state to match the desired configuration. The converted object includes all fields under the CRD schema at the root, not under 'spec'.

By applying this resource, the cluster automatically creates and maintains the defined GitHub repository's configuration, deployment, and synchronization settings.