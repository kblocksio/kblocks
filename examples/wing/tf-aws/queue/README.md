# Queue
A Kubernetes custom resource to create and manage AWS SQS Queues within the Kubernetes environment.

## Options
- `timeoutSec` _(optional)_: The timeout (in seconds) for the queue before a message becomes visible again if it hasn't been deleted after being received. Default value is 60 seconds.

## Examples in Kubernetes Manifests
### Example: Basic Queue
A simple example to create a Queue with the default timeout setting of 60 seconds.
```yaml
apiVersion: acme.com/v1
kind: Queue
metadata:
  name: basic-queue
```

### Example: Custom Timeout Queue
This example demonstrates how to create a Queue with a custom timeout setting of 120 seconds.
```yaml
apiVersion: acme.com/v1
kind: Queue
metadata:
  name: custom-timeout-queue
timeoutSec: 120
```

## Resources
- AWS SQS Queue created in your AWS account.

## Behavior
When you create a Queue custom resource, it triggers the creation of an AWS SQS Queue through the Wing framework. The desired state specified in the Kubernetes manifest is translated into properties for the `QueueSpec` in the Wing manifestation, ensuring the AWS resources are configured accordingly. The `queueUrl` is outputted as part of the resource's status, allowing easy reference in other components or systems.