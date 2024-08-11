# Workload

A Kubernetes custom resource to manage application workloads with deployment, service, and ingress configurations.

## Usage

### Example: basic-workload
A simple workload with only mandatory fields.

```yaml
apiVersion: acme.com/v1
kind: Workload
metadata:
  name: basic-workload

image: my-image
```

### Example: workload-with-port
A workload that exposes a service on a specific port.

```yaml
apiVersion: acme.com/v1
kind: Workload
metadata:
  name: workload-with-port

image: my-image
port: 8080
```

### Example: workload-with-env
A workload that uses environment variables and secrets.

```yaml
apiVersion: acme.com/v1
kind: Workload
metadata:
  name: workload-with-env

image: my-image
port: 80
env:
  MY_ENV_VAR: "value"
envSecrets:
  MY_SECRET: 
    name: "secret-name"
    key: "secret-key"
```

## Configuration

The following fields can be defined in the CRD:

- `image` (str): **[mandatory]** The container image for the workload.
- `replicas` (num): The number of replica pods to run. Default: `1`.
- `port` (num): The port number to expose.
- `env` (Map<str>): A map of environment variables to set in the container.
- `envSecrets` (Map<EnvSecret>): A map of environment variables to set from Kubernetes secrets.
  - `EnvSecret`:
    - `name` (str): The name of the secret.
    - `key` (str): The key to use within the secret.
- `command` (Array<str>): Command to run in the container.
- `route` (str): Ingress path for the workload. If specified, the workload will be exposed publicly.
- `rewrite` (str): Rewrite host header on backend.

## Outputs

The custom resource will generate the following fields under the `status` subresource:

- `host` (str): The hostname of the service.
- `port` (str): The port on which the service is exposed.

These fields can be referenced from other kblocks through `${ref://workload.acme.com/<name>/<field>}`.

## Resources

The following child resources are created and managed by the custom resource:

- **Deployment**: Manages the replica pods for the workload.
- **Service**: Exposes the workload pods on a specified port.
- **Ingress**: (optional) Route traffic to the workload through a specified path.

## Behavior

The resource is implemented by creating a `Wing` object named `Workload` and synthesizing it into Kubernetes manifests. Once applied to the cluster, the Kblocks controller reconciles the state of the cluster with the desired state by converting the object into an instantiation of the `Workload` object. The desired state of the Kubernetes object is passed as the `WorkloadSpec` properties to the new object, which ensures the cluster state matches the specified configuration. Associated resources like deployments, services, and ingress rules are automatically created and managed.