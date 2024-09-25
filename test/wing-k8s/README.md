# WingTest
WingTest is a custom Kubernetes resource that enables you to define and manage resources in a cluster using Wing objects.

## Usage

### Example: Basic WingTest
Define a basic WingTest resource with default settings.

```yaml
apiVersion: kblocks.io/v1
kind: WingTest
metadata:
  name: basic-wtest

# Specify additional fields here if required
```

### Example: Customized WingTest
Define a customized WingTest resource with specific fields.

```yaml
apiVersion: kblocks.io/v1
kind: WingTest
metadata:
  name: custom-wtest

# Specify custom fields here
customField1: value1
customField2: value2
```

## Configuration

The WingTest CRD includes the following fields, which are defined at the root of the resource:

- `customField1`: Description of the field. Default value if applicable.
- `customField2`: Description of the field. Default value if applicable.
  
## Outputs

The WingTest resource creates the following outputs:

- `output1`: Description of the output and its use.
- `output2_optional`: Description of the optional output and its use.

These fields will be available under the `status` subresource of the custom resource and can also be referenced from other kblocks through `${ref://WingTest.kblocks.io/<name>/<field>}`

## Resources

The following resource types may be created by the WingTest custom resource:
- Kubernetes child resources explicitly managed by the custom resource (e.g., Pods, Services, ConfigMaps)
- Names of these resources will be associated with the parent WingTest custom resource.

## Behavior

The WingTest resource is implemented by creating a Wing object using the `WingTest` kind and synthesizing it into Kubernetes manifests. Once the resource is applied to the cluster, the Kblocks controller will reconcile the cluster's state with the desired state. This involves converting the object into an instantiation of the `WingTest` object, while passing the Kubernetes object's desired state as the `WingTestSpec` properties to the new object.

The custom resource tracks and manages any child resources created as a result of this process, ensuring they are associated with and governed by the parent WingTest resource.