# Queue

A Kubernetes custom resource to create and manage AWS SQS Queues within the Kubernetes environment.

## Usage

### Example: Basic Queue
A simple example to create a Queue with the default timeout setting.

```yaml
apiVersion: acme.com/v1
kind: Queue
metadata:
  name: basic-queue
```

### Example: Custom Timeout Queue
An example showing how to set a custom timeout for the Queue.

```yaml
apiVersion: acme.com/v1
kind: Queue
metadata:
  name: custom-timeout-queue

timeoutSec: 120
```

## Configuration

The following fields can be configured in the Queue custom resource definition (CRD):

- `timeoutSec` _(optional)_: The timeout setting for the Queue, specified in seconds. If not specified, the default is 60 seconds.

## Outputs

- `queueUrl`: The URL of the created AWS SQS Queue. This field will be available under the `status` subresource of the custom resource and can be also referenced from other kblocks through `${ref://Queue.acme.com/<name>/queueUrl}`.

## Resources

The Queue custom resource creates the following Kubernetes and AWS resources:

- AWS SQS Queue

## Behavior

The behavior of the Queue custom resource involves creating a Wing object by the name of `Queue` and synthesizing it into Kubernetes manifests. Once the resource is applied to the cluster, the Kblocks controller will reconcile the state of the cluster with the desired state by converting the object into an instantiation of the `Queue` object, while passing the Kubernetes object desired state as the `QueueSpec` properties to the new object. The resources created will be associated with the parent custom resource and tracked by it.