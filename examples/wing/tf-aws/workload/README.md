# Workload
A Kubernetes Custom Resource Definition (CRD) for managing workloads.

## Options
- `image` (string, required): The container image to use. This is a mandatory field that specifies the Docker image which the container will run.
- `port` (number, optional): The port number the container listens on. If specified, this port will be used when creating the Kubernetes Service.
- `command` (array of strings, optional): The command to run in the container. This overrides the Docker image's default command.
- `readiness` (array of strings, optional): The command to run to determine if the container is ready. Useful for defining a readiness probe.
- `env` (map of strings or EnvVariable objects, optional): Environment variables to set in the container. Supports direct values and references to secrets or config maps.
- `envSecrets` (map of `EnvSecret`, optional): Maps environment variable names to secret resources to source their values dynamically.
- `envFrom` (array of objects, optional): Environment variables to read as a set from a secret or config map using a prefix and optional indication.
- `replicas` (number, optional): The number of replicas to create for this container. Defaults to 1 if not specified.
- `route` (string, optional): Ingress path for this workload. If specified, the workload will be publicly exposed via a Kubernetes Ingress resource.
- `rewrite` (string, optional): Rewrite directive for host header on backend when using a route.
- `tls` (string, optional): Secret name containing the TLS certificate and key to use for this workload, allowing secure connections.

## Examples in Kubernetes Manifests
### Example: Simple Workload
```yaml
apiVersion: acme.com/v1
kind: Workload
metadata:
  name: simple-workload
image: hashicorp/http-echo
route: /echo
port: 5678
env:
  ECHO_TEXT: "Hello, world"
```

### Example: Workload with Readiness Probe and Secrets
```yaml
apiVersion: acme.com/v1
kind: Workload
metadata:
  name: workload-with-secrets
image: nginx
port: 80
readiness:
  - "curl"
  - "-f"
  - "http://localhost/healthz"
envSecrets:
  DB_PASSWORD:
    name: my-db-secret
    key: password
```

### Example: Workload with Ingress and TLS
```yaml
apiVersion: acme.com/v1
kind: Workload
metadata:
  name: workload-with-ingress
image: httpd
port: 80
route: /httpd
tls: my-tls-secret
```

## Resources
- **Deployment**: A Kubernetes Deployment with the specified container specifications to ensure desired state.
- **Service**: A Kubernetes Service to expose the Deployment on a specified port, generating a DNS name.
- **Ingress**: Configured when a `route` is specified, allowing public access to the Service. Supports optional TLS if `tls` is defined.

## Behavior
The `Workload` resource manifests convert into Kubernetes Deployment, Service, and optional Ingress resources. It automates deploying containerized applications with configuration driven by specified fields. Modifications update the state efficiently using kblocks reconciliations.