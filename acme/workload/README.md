# Workload

A Kubernetes custom resource for deploying and managing containerized applications with custom policies.

## Usage

### Example: Simple Workload

This example demonstrates a basic instance of a `Workload` resource with a specified container image and port.

```yaml
apiVersion: acme.com/v1
kind: Workload
metadata:
  name: example-workload

image: nginx
port: 80
```

### Example: Workload with Environment Variables

This example shows how to pass environment variables and environment variables from secrets to the container.

```yaml
apiVersion: acme.com/v1
kind: Workload
metadata:
  name: env-workload

image: nginx
port: 80
env:
  EXAMPLE_VAR: "example value"
envSecrets:
  SECRET_VAR:
    name: example-secret
    key: secret-key
```

### Example: Workload with Ingress

This example demonstrates how to configure a workload with an ingress to expose it publicly.

```yaml
apiVersion: acme.com/v1
kind: Workload
metadata:
  name: ingress-workload

image: nginx
port: 80
route: /example
rewrite: /$1
```

## Configuration

- **image**: The container image to use.
- **port** (optional): The port number the container listens on.
- **command** (optional): The command to run in the container.
- **readiness** (optional): The command to run to determine if the container is ready.
- **env** (optional): Environment variables to set in the container.
- **envSecrets** (optional): Environment variables to set in the container from a secret.
- **envFrom** (optional): Environment variables to set in the container from a config map or secret.
- **replicas** (optional): The number of replicas to create for this container.
- **route** (optional): Ingress path for this workload. If specified, this workload will be exposed publicly.
- **rewrite** (optional): Rewrite host header on backend.
- **allow** (optional): Specifies which API resources this workload can access and which verbs can be used.

## Outputs

- **host**: The hostname of the service exposed by the workload.
- **port**: The port number the workload is accessible on.

These fields will be available under the `status` subresource of the custom resource and can also be referenced from other kblocks through `${ref://workload.acme.com/<name>/<field>}`.

## Resources

- **Deployment**: Manages the deployment of the containerized workload.
- **ServiceAccount**: Associates the workload with the appropriate permissions.
- **Service**: Exposes the containerized workload (if `port` is specified).
- **Ingress**: Configures ingress rules for the workload (if `route` is specified).

## Behavior

The `Workload` resource is implemented by creating a Wing object named `Workload` and synthesizing it into Kubernetes manifests. Once the resource is applied to the cluster, the Kblocks controller will reconcile the state of the cluster with the desired state by converting the object into an instantiation of the `Workload` object, passing the Kubernetes object desired state as the `WorkloadSpec` properties to the new object. The resources created will be associated with the parent custom resource and tracked by it.