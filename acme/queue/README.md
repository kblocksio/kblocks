# Queue CRD

A Custom Resource Definition (CRD) for creating and managing a Queue resource in Kubernetes.

## Usage

### Example: Basic Queue
A basic example of creating a Queue resource.

```yaml
apiVersion: acme.com/v1
kind: Queue
metadata:
  name: basic-queue

timeoutSec: 60
```

### Example: Custom Timeout Queue
Creating a Queue with a custom timeout value.

```yaml
apiVersion: acme.com/v1
kind: Queue
metadata:
  name: custom-timeout-queue

timeoutSec: 120
```

## Configuration

The Queue custom resource supports the following fields at the root level:

- `timeoutSec` (optional, number): The timeout in seconds for the queue. Defaults to `60` seconds if not specified.

## Outputs

The `Queue` resource outputs the following fields:

- `queueUrl`: The URL of the created queue.

These fields will be available under the `status` subresource of the custom resource and can also be referenced from other kblocks through `${ref://Queue.acme.com/<name>/queueUrl}`.

## Resources

When a Queue custom resource is created, the following Kubernetes resources are generated:

- `Queue` objects in AWS with the specified timeout.

## Behavior

The Queue resource is implemented by creating a Wing object by the name of `Queue` and synthesizing it into Kubernetes manifests. Once the resource is applied to the cluster, the Kblocks controller will reconcile the state of the cluster with the desired state by converting the object into an instantiation of the `Queue` object. The desired state as specified in the Kubernetes object is passed as `QueueSpec` properties to the new object.

The resources created will be associated with the parent custom resource and tracked by it. 

By defining a `QueueSpec`, you can specify various configurations such as the `timeoutSec` for the queue. The `Queue` class will instantiate a new `cloud.Queue` and set a consumer to log new messages. The `queueUrl` is extracted from the AWS queue and is made available as a Terraform output marked by `staticId`.