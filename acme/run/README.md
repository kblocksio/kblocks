# Run

The `Run` custom resource is a Kubernetes native object that allows you to define and execute jobs with specified container configurations.

## Usage

### Example: Simple Run

A simple example of the `Run` resource where the job uses the `busybox` image.

```yaml
apiVersion: acme.com/v1
kind: Run
metadata:
  name: simple-run

# No additional fields specified, defaults will be used
```

### Example: Run with Custom Image and Command

An example of a `Run` resource with a specified Docker image and command.

```yaml
apiVersion: acme.com/v1
kind: Run
metadata:
  name: custom-run

image: "nginx:latest"
command: ["/bin/echo", "Hello, World!"]
```

### Example: Run with Environment Variables and Secrets

An example that uses environment variables and secrets.

```yaml
apiVersion: acme.com/v1
kind: Run
metadata:
  name: env-run

env:
  MY_ENV_VAR: "value"

envSecrets:
  SECRET_VAR:
    name: "my-secret"
    key: "my-secret-key"
```

## Configuration

The fields in the `Run` custom resource are defined at the root level. Below are the available fields:

- `image` (Optional): The Docker image to use for the job. Defaults to `busybox`.
- `env` (Optional): A map of environment variable key-value pairs.
- `envSecrets` (Optional): A map where each key is an environment variable name and the value is an object specifying a Kubernetes secret and its key within that secret.
  - `name`: The name of the Kubernetes secret.
  - `key`: The key within the Kubernetes secret.
- `command` (Optional): An array of strings representing the command to run in the container.
- `readiness` (Optional): An array of strings representing readiness checks.
- `retries` (Optional): The number of retries for the job. Defaults to 10.

## Resources

The `Run` custom resource creates the following Kubernetes child resources:

- `Job`: A Kubernetes Job resource configured according to the `Run` resource specifications.
- `Container`: A container within the job, configured with the given image, command, environment variables, and readiness checks.

## Behavior

The resource is implemented by creating a `Run` object and synthesizing it into Kubernetes manifests. Once applied to the cluster, the Kblocks controller reconciles the cluster state with the desired state specified in the `Run` custom resource. This involves creating and managing Kubernetes resources such as Jobs and Containers, based on the specifications provided in the `Run` resource. Environment variables and secrets defined in the resource are also propagated to the container within the job.