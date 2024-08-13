# Run
A Kubernetes Custom Resource Definition (CRD) for managing job executions.

## Usage

### Example: Simple Run
Creates a `Run` resource with default values.

```yaml
apiVersion: acme.com/v1
kind: Run
metadata:
  name: simple-run

retries: 5
container:
  image: nginx
  name: nginx-container
```

### Example: Run with Custom Service Account
Creates a `Run` resource with a custom service account.

```yaml
apiVersion: acme.com/v1
kind: Run
metadata:
  name: custom-sa-run

retries: 3
serviceAccountName: custom-sa
container:
  image: busybox
  name: busybox-container
  command: ["sleep", "3600"]
```

## Configuration
The `Run` CRD has the following fields:

- **retries**: *(integer)* The number of retries to attempt before giving up. Default is `10`.
- **container**: *(object)* The container specifications for the job, including fields like `name`, `image`, `command`, and more.
- **serviceAccountName**: *(string)* Specifies the service account to be used by the job's pod. If not set, a new service account will be created.

## Resources
The `Run` custom resource creates the following child resources:

- **Job**: The Kubernetes Job resource that runs the specified container.
- **ServiceAccount**: A service account used by the Job's Pod if the `serviceAccountName` is not specified.

## Behavior
The `Run` resource is implemented by creating a Wing object named `Run` and synthesizing it into Kubernetes manifests. Once the resource is applied to the cluster, the Kblocks controller will reconcile the state of the cluster with the desired state by converting the object into an instantiation of the `Run` object, while passing the Kubernetes object desired state as the `RunSpec` properties to the new object. The resources created will be associated with the parent `Run` custom resource and tracked by it.