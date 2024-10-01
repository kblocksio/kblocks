# TestResource
A kblock wing/k8s test resource

## Usage

### Example: Basic TestResource
Creates a simple TestResource object.

```yaml
apiVersion: testing.kblocks.io/v1
kind: TestResource
metadata:
  name: basic-testresource

hello: "Hello"
```

### Example: Custom Greeting TestResource
Creates a TestResource object with a custom greeting.

```yaml
apiVersion: testing.kblocks.io/v1
kind: TestResource
metadata:
  name: custom-greeting-testresource

hello: "Greetings"
```

## Configuration
- `hello` (string)
  - A greeting string that will be used to generate the `message` output. There is no default value, and it must be provided.

## Outputs
- `message` (string)
  - A message created by the resource. This message is generated from the `hello` field.

These fields will be available under the `status` subresource of the custom resource and can be also referenced from other kblocks through `${ref://testresource.testing.kblocks.io/<name>/message}`

## Resources
This custom resource creates the following Kubernetes child resource:
- ConfigMap with the name `test-resource`

## Behavior
The TestResource is implemented by creating a Wing object by the name of `TestResource` and synthesizing it into Kubernetes manifests. Once the resource is applied to the cluster, the Kblocks worker will reconcile the state of the cluster with the desired state by converting the object into an instantiation of the `TestResource` object, while passing the Kubernetes object desired state as the `TestResourceSpec` properties to the new object. The resources created will be associated with the parent custom resource and tracked by it.