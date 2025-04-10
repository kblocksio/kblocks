# Pulumi

This block type is backed by [Pulumi](https://pulumi.com/). It allows you to provision infrastructure resources using Pulumi configurations.

## Block Manifest

The `kblock.yaml` file defines the block manifest, containing block definitions like names, icons,
description and optional operator environment settings.

To use Pulumi to provision resources:

1. Set `spec.engine` to `pulumi`

```yaml
apiVersion: kblocks.io/v1
kind: Block
spec:
  engine: pulumi
```

2. Upload the Pulumi access token to a Kubernetes secret and specify the secret name under
   `envSecrets`:

```yaml
spec:
  operator:
    envSecrets:
      PULUMI_ACCESS_TOKEN: pulumi-access-token
```

## Input Schema

The input schema is defined in `src/values.schema.json`. Schema fields map to [Pulumi
Configurations](https://www.pulumi.com/docs/iac/concepts/config/) defined in the current project.

For example, if your schema looks like this:

```json
{
  "type": "object",
  "properties": {
    "foo": { "type": "string" }
  }
}
```

You can access it from your Pulumi code (in TypeScript) like this:

```ts
const foo = config.require("foo");
```

## Implementation

The implement is a standard Pulumi program, so you can use any supported language and settings. The
implementation is currently creating a new stack per block instance.

Specify any environment provider specific secrets such as AWS credentials via additional
`envSecrets`.

For example:

```yaml
spec:
  operator:
    envSecrets:
      AWS_DEFAULT_REGION: aws-credentials
      AWS_ACCESS_KEY_ID: aws-credentials
      AWS_SECRET_ACCESS_KEY: aws-credentials
```

## Outputs

Outputs listed in `kblock.yaml` (under `outputs`) are read from [Pulumi
Outputs](https://www.pulumi.com/docs/iac/concepts/inputs-outputs/) defined in your configuration.

For example, if your `kblock.yaml` has an `outputs` field like this:

```yaml
spec:
  outputs:
    - bar
```

You can define a Pulumi output like this:

```ts
export const bar = "this is my output";
```

## Example

The following example defines a `PulumiBucket` resource.

The `kblock.yaml` manifest uses `pulumi` as an engine and `bucketName` under `outputs`:

```yaml
apiVersion: kblocks.io/v1
kind: Block
metadata:
  name: pulumi-bucket
  namespace: kblocks
spec:
  engine: pulumi
  definition:
    group: pulumi.kblocks.io
    version: v1
    kind: PulumiBucket
    plural: pulumibuckets
    categories:
      - cloud
    readme: README.md
    icon: heroicon://sparkles
    color: yellow
    description: kblock pulumi bucket
    schema: ./src/values.schema.json
    outputs:
      - bucketName
  operator:
    envSecrets:
      AWS_REGION: creds
      PULUMI_ACCESS_TOKEN: creds
      AWS_ACCESS_KEY_ID: creds
      AWS_SECRET_ACCESS_KEY: creds
      AWS_DEFAULT_REGION: creds
```

The `src/values.schema.json` files defines the input schema. In this case, we just define `bucket`
as a single string field:

```json
{
  "type": "object",
  "required": ["bucket"],
  "properties": {
    "bucket": {
      "type": "string"
    }
  }
}
```

And this is the Pulumi entrypoint file under `index.ts`:

```ts
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();
const name = config.require("bucket"); // <-- this is the input field

// Create an AWS resource (S3 Bucket)
const bucket = new aws.s3.BucketV2(name);

// Export the name of the bucket
export const bucketName = bucket.id; // <-- this is the output
```
