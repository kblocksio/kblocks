# Terraform

[Terraform](https://www.terraform.io/) is a tool for building, changing, and versioning
infrastructure safely and efficiently.

Kblocks allows you to create Kubernetes Custom Resources (CRDs) that are backed by Terraform. When a
resource is created, updated or deleted, Kblocks will use Terraform to manage the underlying
infrastructure.

## Block Manifest

To create a Terraform block, the `engine` field in the [`kblock.yaml`](../01-manifest.md) should be
set to `terraform`:

```yaml
apiVersion: kblocks.io/v1
kind: Block
spec:
  engine: terraform
```

## Input Schema

The input schema for your block is defined in `src/values.schema.json`.

Schema fields map to [Terraform
Variables](https://developer.hashicorp.com/terraform/language/values/variables) defined in
`src/variables.tf`.

For example, if your schema looks like this:

`src/values.schema.json`:

```json
{
  "type": "object",
  "properties": {
    "foo": { "type": "string" }
  }
}
```

You can define a Terraform variable like this:

`src/variables.tf`:

```hcl
variable "foo" {
  type = string
}
```

## Implementation

The `src` directory is the entrypoint for your Terraform configuration. It's a completely
standard Terraform project.

By convention, the `src/main.tf` file is the entrypoint for your infrastructure definition.

### Providers

You can use any Terraform provider in your configuration. Kblocks will run `terraform init` to
install them when the block runtime environment is created.

### Secrets

Use the `envSecrets` field in `kblock.yaml` to map environment variables to Kubernetes secrets as
needed by the Terraform providers you are using.

For example, to use the AWS provider, you can map the `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
environment variables to Kubernetes secrets:

```yaml
envSecrets:
  AWS_DEFAULT_REGION: aws-credentials
  AWS_ACCESS_KEY_ID: aws-credentials
  AWS_SECRET_ACCESS_KEY: aws-credentials
```

### State Management

Without any additional configuration, Kblocks will use the Kubernetes Control Plane via
[etcd](https://etcd.io/) to store Terraform state. This is convenient for small and medium-sized
projects (etcd has a limitation of 1MB per key).

For larger projects, you can use an external state management solution like [Terraform
Cloud](https://www.terraform.io/cloud), [Azure Blob
Storage](https://azure.microsoft.com/en-us/products/storage/blobs) or [AWS
S3](https://aws.amazon.com/s3/).

To configure a Terraform Cloud backend, add a
[`backend`](https://developer.hashicorp.com/terraform/language/backend):

```hcl
terraform {
  backend "remote" {
    organization = "my-org"
    workspaces {
      name = "my-workspace"
    }
  }
}
```

## Outputs

Outputs listed in `kblock.yaml` are read from [Terraform
Outputs](https://developer.hashicorp.com/terraform/language/values/outputs) defined in your
configuration.

For example, if your `kblock.yaml` has an `outputs` field like this:

```yaml
outputs:
  - myOutput
```

You can define a Terraform output like this:

```hcl
output "myOutput" {
  value = "myValue"
}
```

## Example

This example demonstrates how to create a Terraform block that creates an AWS EC2 instance.

`kblock.yaml`:

```yaml
apiVersion: kblocks.io/v1
kind: Block
metadata:
  name: hosts.example.com
spec:
  engine: tofu
  definition:
    description: Represents an EC2 instance
    icon: heroicon://server-stack
    readme: ./README.md
    schema: src/values.schema.json
    outputs:
      - hostname
      - ip
      - dnsName
    group: example.com
    version: v1
    kind: Host
    plural: hosts
    singular: host
  operator:
    envSecrets:
      AWS_DEFAULT_REGION: aws-credentials
      AWS_ACCESS_KEY_ID: aws-credentials
      AWS_SECRET_ACCESS_KEY: aws-credentials
```

`src/values.schema.json`:

```json
{
  "type": "object",
  "required": [],
  "properties": {
    "type": {
      "type": "string",
      "description": "The machine type of the EC2 instance",
      "enum": ["t2.micro", "t2.small", "t2.medium", "t2.large", "t2.xlarge", "t2.2xlarge"],
      "default": "t2.micro"
    }
  }
}
```

`src/main.tf`:

```hcl
variable "type" {
  description = "The machine type of the EC2 instance"
  type        = string
  default     = "t2.micro"
}

data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-ebs"]
  }
}

resource "aws_instance" "my_instance" {
  ami           = data.aws_ami.amazon_linux_2.id
  instance_type = var.type

  tags = {
    Name = "my-instance"
  }
}

output "hostname" {
  value       = aws_instance.my_instance.id
  description = "The hostname of the EC2 instance"
}

output "dnsName" {
  value       = aws_instance.my_instance.public_dns
  description = "The DNS name of the EC2 instance"
}

output "ip" {
  value       = aws_instance.my_instance.public_ip
  description = "The public IP address of the EC2 instance"
}
```
