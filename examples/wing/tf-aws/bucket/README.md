# Bucket

Amazon Simple Storage Service (Amazon S3) is an object storage service that offers industry-leading
scalability, data availability, security, and performance. You can use Amazon S3 to store and
retrieve any amount of data at any time, from anywhere.

## Options

### Required Fields
- `region` (string): The AWS region where the S3 bucket will be created. This field is critical as it determines the bucket's geographical location.

### Optional Fields
- `public` (boolean): Sets whether the S3 bucket should be publicly accessible. The default is `false`, meaning the bucket is private.

## Examples in Kubernetes Manifests

### Example 1: Private Bucket
```yaml
apiVersion: acme.com/v1
kind: Bucket
metadata:
  name: private-bucket
spec:
  region: us-east-1
```

### Example 2: Public Bucket
```yaml
apiVersion: acme.com/v1
kind: Bucket
metadata:
  name: public-bucket
spec:
  region: us-east-1
  public: true
```

### Example 3: Specifying a Different Region
```yaml
apiVersion: acme.com/v1
kind: Bucket
metadata:
  name: regional-bucket
spec:
  region: eu-west-1
```

## Resources
The creation of this custom resource results in:
- An AWS S3 bucket tailored with the given configurations, including its name, region, and accessibility settings.

## Behavior
The Bucket resource abstracts the complexity of creating S3 buckets within Kubernetes. Usage of this resource allows for easy management of S3 buckets through Kubernetes manifests. The `public` field defines its accessibility, while the `region` field sets the AWS region. Adjustments to these parameters reflect directly in the bucket's AWS configuration.