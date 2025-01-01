---
sidebar_position: 2
---

# Getting Started

## Prerequisites

Before using KBlocks, ensure you have:

- Kubernetes cluster access
- kubectl installed and configured
- Helm v3+ installed (for Helm-based blocks)
- Node.js 16+ (for development)

## Installation

Install the KBlocks CLI using npm:

```bash
npm install -g @kblocks/cli
```

## Cluster Configuration

In order to be able to install blocks to your cluster, you will need to create a secret called `kblocks` which contains cluster-global configuration.

```bash
kubectl create secret generic kblocks --from-literal=KBLOCKS_SYSTEM_ID=my-cluster
```

At the minimum, the secret must contain the `KBLOCKS_SYSTEM_ID` key. This is used to identify the cluster to the operator.

You can also specify the following optional keys:

- `KBLOCKS_API_KEY` - The API key for the Kblocks portal.
- `KBLOCKS_PUBSUB_HOST` and `KBLOCKS_PUBSUB_PORT` - The host and port for the Kblocks pubsub service.
- `KBLOCKS_STORAGE_PREFIX` - The prefix for the Kblocks storage service.
- `KBLOCKS_ACCESS` - indicates which type of access the operator should have on the cluster (read-only or read-write)

## Creating Your First Block

Let's create a simple block that represents an SQS queue and is backed by a Terraform provider.

1. Initialize a new block project:

```bash
kb init tofu queue --group example.com --kind Queue --plural queues
```

2. Navigate to the project directory:

```bash
cd queue
```

3. Edit the `kblock.yaml` file to define the block:

```yaml
apiVersion: kblocks.io/v1
kind: Block
spec:
  engine: tofu
  definition:
    description: An Amazon SQS queue
    icon: heroicon://queue-list
    readme: ./README.md
    schema: src/values.schema.json
    outputs:
      - queueUrl
    group: example.com
    version: v1
    kind: Queue
    plural: queues
    singular: queue
  operator:
    envSecrets:
      AWS_DEFAULT_REGION: aws-credentials
      AWS_ACCESS_KEY_ID: aws-credentials
      AWS_SECRET_ACCESS_KEY: aws-credentials
metadata:
  name: queues.example.com
```

You'll notice that the operator reads a bunch of environment variables from the `aws-credentials`
secret. Specifically these are used to configure the Terraform AWS provider.

4. Define the custom resource schema in `src/values.schema.json`:

```json
{
  "type": "object",
  "required": [ "queueName" ],
  "properties": {
    "queueName": {
      "type": "string",
      "description": "The name of the queue"
    },
    "timeout": {
      "type": "number",
      "description": "Queue timeout in seconds"
    }
  }
}
```

In our example, we will require a `queueName` attribute which defines the name of the queue and an
optional `timeout` attribute which defines the timeout of the queue.

5. Add the `queueName` and `timeout` variables to the `src/variables.tf` file:

```hcl
variable "queueName" {
  type        = string
  description = "The name of the queue"
  required    = true
}

variable "timeout" {
  type        = number
  description = "Queue timeout in seconds"
  default     = null
}
```

6. Define the Terraform configuration in `src/main.tf`:

```hcl
resource "aws_sqs_queue" "queue" {
  name = var.queueName
  visibility_timeout_seconds = var.timeout
}
```

For our example, we will simply propagate the `queueName` and `timeout` variables to the Terraform
configuration.

7. Build the block:

```bash
kb build
```

This command created a `dist/` directory with a Helm chart that is ready to deploy to a cluster. It also
outputs the command to use.

8. Create a secret with the AWS credentials (replace with your own):

```bash
kubectl create secret generic aws-credentials \
  --from-literal=AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
  --from-literal=AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
  --from-literal=AWS_DEFAULT_REGION=us-east-1
```

9. Install the block to your cluster using `helm`:

```bash
helm upgrade --install queue-block ./dist
```

10. Wait for the pods to be ready:

```bash
kubectl get pods
```

You should see something like this:

```
NAME                                                   READY   STATUS    RESTARTS   AGE
kblocks-queue-control-7b8c7fc5b5-n4bcr                 1/1     Running   0          4m9s
kblocks-queue-operator-58fd74668b-4vnxj                2/2     Running   0          4m9s
kblocks-queue-worker-0                                 1/1     Running   0          4m9s
``` 

## Next Steps

- Explore different [block types](block-types/index.md)
- Learn about the [CLI commands](cli-reference.md)
- Check out example implementations 