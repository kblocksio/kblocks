# Portal
A custom Kubernetes resource that enables creating and managing GitHub repositories with ArgoCD applications.

## Usage
### Example: Create a Portal

This example demonstrates how to create a `Portal` resource.

```yaml
apiVersion: acme.com/v1
kind: Portal
metadata:
  name: example-portal

repo:
  name: example-repo
  owner: example-owner
  public: true
```

### Example: Create a Private Portal

This example demonstrates how to create a private GitHub repository using the `Portal` resource.

```yaml
apiVersion: acme.com/v1
kind: Portal
metadata:
  name: private-portal

repo:
  name: private-repo
  owner: private-owner
  public: false
```

## Configuration
The `Portal` custom resource definition includes the following fields:

- `repo`
  - `name` (string): The name of the GitHub repository. No default value.
  - `owner` (string): The owner of the GitHub repository. No default value.
  - `public` (boolean): Whether the repository is public. Default is `false`.

## Resources
The following Kubernetes resources are created by the `Portal` custom resource:

- **Repository Resource**: A representation of the GitHub repository as a Kubernetes resource.
- **ArgoCD Application**: Creates an ArgoCD Application resource to manage deployments from the GitHub repository.
- **Secret**: A Kubernetes Secret with GitHub repository credentials.

## Behavior
The `Portal` resource is implemented by creating a Wing object of type `Portal` and synthesizing it into Kubernetes manifests. Once the resource is applied to the cluster, the Kblocks controller will reconcile the state of the cluster with the desired state by transforming the `Portal` object, passing the desired state as `PortalSpec` properties to the new object.

The reconciliation process involves:

1. Creating a GitHub repository using the specified `repo` details.
2. Setting up an ArgoCD Application that deploys code from the repository.
3. Managing Kubernetes Secrets for repository access credentials.

Through this process, the `Portal` custom resource ensures that the specified GitHub repository and deployment configuration are maintained as described in the Kubernetes resource definition.