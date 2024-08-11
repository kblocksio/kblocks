# Bucket
A Kubernetes custom resource representing an S3 bucket.

## Usage

### Example: Public Bucket

Creating an S3 bucket that is publicly accessible.

```yaml
apiVersion: acme.com/v1
kind: Bucket
metadata:
  name: my-public-bucket

public: true
region: us-east-1
```

### Example: Private Bucket

Creating an S3 bucket that is private.

```yaml
apiVersion: acme.com/v1
kind: Bucket
metadata:
  name: my-private-bucket

public: false
region: us-west-2
```

## Configuration

The following fields can be configured for the `Bucket` resource:

- **region**: (Optional) The region where the S3 bucket will be created. If not specified, defaults to `us-east-1`.
- **public**: (Optional) A boolean flag indicating if the bucket should be publicly accessible. Defaults to `false`.

## Resources

This custom resource creates the following Kubernetes resources:

- `Bucket` from the API `s3.aws.crossplane.io/v1beta1`

## Behavior

The resource is implemented by creating a Wing object named `Bucket` and synthesizing it into Kubernetes manifests. When applied to the cluster, the Kblocks controller will reconcile the cluster's state with the desired state by converting the custom resource into an instance of the `Bucket` object. The desired state of the Kubernetes object is passed as `BucketSpec` properties to the new object. Resources created will be associated with the parent custom resource and tracked by it.