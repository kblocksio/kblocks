# PulumiBucket

A Kubernetes Custom Resource for managing AWS S3 buckets using Pulumi.

## Description

The PulumiBucket resource allows you to create and manage AWS S3 buckets through Kubernetes manifests using Pulumi as the infrastructure provider. This enables seamless integration of S3 bucket management within your Kubernetes workflow.

## Resources

The creation of this custom resource results in:

- An AWS S3 bucket managed through Pulumi infrastructure as code
- Automatic configuration and management of bucket settings and permissions

## Behavior

The PulumiBucket resource abstracts the complexity of creating S3 buckets using Pulumi within Kubernetes. When you create an instance of this resource, it will:

1. Use Pulumi to provision an S3 bucket in your AWS account
2. Manage the bucket's lifecycle through Kubernetes
3. Provide outputs like bucket name for use in other resources

## Outputs

- `bucketName`: The name of the created S3 bucket

## Requirements

- AWS credentials configured through environment secrets
- Pulumi access token for infrastructure management
- Appropriate IAM permissions to create and manage S3 buckets

## Examples in Kubernetes Manifests

```yaml
apiVersion: acme.com/v1
kind: PulumiBucket
metadata:
  name: my-pulumi-bucket
bucket: my-pulumi-bucket
```
