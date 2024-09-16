# Quick8s Cluster

A Kubernetes cluster for development and testing.

## Usage

### Example: basic-usage

Create a cluster.

```yaml
apiVersion: acme.com/v1
kind: Quick8s
metadata:
  name: basic-usage
```

### Example: advanced-usage
Create a Quick8s resource with additional metadata.

```yaml
apiVersion: acme.com/v1
kind: Quick8s
metadata:
  name: advanced-usage
  labels:
    env: production
  annotations:
    description: "An advanced Quick8s example"
```

### Example: dev-environment

Setting up a Quick8s resource for a development environment.

```yaml
apiVersion: acme.com/v1
kind: Quick8s
metadata:
  name: dev-environment
  labels:
    env: development
```

## Configuration

The fields in the CRD for Quick8s are defined as part of the `Quick8sSpec`. These fields are at the **root** of the resource, not under 'spec':

- **group:** Specifies the API group. (Default: "acme.com")
- **version:** The version of the resource. (Default: "v1")
- **kind:** The type of resource. (Default: "Quick8s")
- **plural:** The plural name of the resource. (Default: "quick8ses")
- **singular:** The singular name of the resource. (Default: "quick8s")
- **categories:** The resource categories. (Default: ["all"])
- **listKind:** The list kind of the resource. (Default: "Quick8sList")
- **shortNames:** Short names for the resource. (Default: ["q8s"])

## Outputs

- **host:** The host address of the Quick8s instance.
- **port:** The port number on which the Quick8s instance is accessible.

These fields will be available under the `status` subresource of the custom resource and can also be referenced from other kblocks through `${ref://quick8s.acme.com/<name>/<field>}`.

## Resources

The following explicit Kubernetes child resources are created by the Quick8s custom resource:

- **SecurityGroup:** A security group associated with the Quick8s instance.
- **Instance:** An EC2 instance running based on the Quick8s configuration.
  
## Behavior

The Quick8s resource is implemented by creating a Wing object of the name `Quick8s` and synthesizing
it into Kubernetes manifests. Once the resource is applied to the cluster, the Kblocks controller
will reconcile the state of the cluster with the desired state by converting the object into an
instantiation of the `Quick8s` object. The Kubernetes object's desired state will be passed as
`Quick8sSpec` properties to the new object. The resources created will be associated with the parent
custom resource and tracked by it.