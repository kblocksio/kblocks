bring cloud;
bring aws;
bring "cdktf" as cdktf;

pub struct BucketSpec {
  ///
  /// Indicates if the contents of this bucket should be publicly accessible.
  ///
  /// @default true
  /// @order 1
  ///
  public: bool?;

  ///
  /// Delete all objects in the bucket when the bucket is destroyed.
  ///
  /// @default false
  /// @order 2
  ///
  forceDestroy: bool?;

  ///
  /// Enable cross-origin resource sharing (CORS) for the bucket. When enabled, this option allows
  /// any origin to access this bucket.
  ///
  /// @default false
  /// @order 3
  ///
  cors: bool?;
}

pub class Bucket {
  pub bucketArn: str;

  new(spec: BucketSpec) {
    let b = new cloud.Bucket(public: spec.public, forceDestroy: spec.forceDestroy, cors: spec.cors  );
    if let b = aws.Bucket.from(b) {
      this.bucketArn = b.bucketArn;

      let regionDataSource = new cdktf.TerraformDataSource(
        terraformResourceType: "aws_region",
      );
  
      let region = regionDataSource.getStringAttribute("name");

      let awsConsoleUrl = "https://{region}.console.aws.amazon.com/s3/buckets/{b.bucketName}?region={region}";

      new cdktf.TerraformOutput(value: b.bucketArn, staticId: true) as "bucketArn";
      new cdktf.TerraformOutput(value: b.bucketName, staticId: true) as "bucketName";
      new cdktf.TerraformOutput(value: b.bucketDomainName, staticId: true) as "bucketDomainName";
      new cdktf.TerraformOutput(value: awsConsoleUrl, staticId: true) as "awsConsole";
    }
  }
}