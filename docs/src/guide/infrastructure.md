# Infrastructure Code

Now we'll define the Terraform configuration that creates our SQS queue.

Define the Terraform configuration in `src/main.tf`:

```hcl
resource "aws_sqs_queue" "queue" {
  name = var.queueName
  visibility_timeout_seconds = var.timeout
}

output "queueUrl" {
  value = aws_sqs_queue.queue.url
}
```

This configuration:
- Creates an SQS queue with the specified name and timeout
- Outputs the queue URL which can be used by other resources

Next, let's [deploy our block](./deployment.md) to the cluster. 