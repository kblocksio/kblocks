# Argo
A Kubernetes custom resource for managing ingress configurations using Helm charts.

## Usage

### Example: Basic Ingress Configuration
This example shows how to create an Argo custom resource that sets up an Ingress with a specified host.

```yaml
apiVersion: acme.com/v1
kind: Argo
metadata:
  name: example-argo
ingressHost: example.com
```

## Configuration

- `ingressHost` (string): Specifies the host for the Ingress resource. This field is required if you want to set up an Ingress.

## Resources

- `Ingress`: A Kubernetes Ingress resource named `ingress`.

## Behavior

The Argo custom resource is implemented through a Helm chart, which is a collection of templates and values used to generate Kubernetes manifests. When the resource is applied to the cluster, the Kblocks controller will reconcile the state of the cluster with the desired state by converting the object into Helm 'values'. The resources created will be associated with the parent custom resource and tracked by it.

This implementation supports standard Kubernetes API tools such as `kubectl`, `kustomize`, and `helm charts` to manage the resources.
