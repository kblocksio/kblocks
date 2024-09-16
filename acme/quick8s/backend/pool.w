bring cloud;
bring "./types.w" as t;
bring "cdktf" as cdktf;
bring aws;

pub class Pool {
  pub bucket: cloud.Bucket;

  new() {
    this.bucket = new cloud.Bucket();

    if let s3Bucket = aws.Bucket.from(this.bucket) {
      new cdktf.TerraformOutput(
        value: s3Bucket.bucketName,
        staticId: true,
      ) as "PoolBucketName";
    }
  }

  pub inflight tryAlloc(options: t.ClusterAttributes): t.Host? {
    let prefix = this.prefixFor(options);
    let keys = this.bucket.list("{prefix}/");

    if keys.length == 0 {
      return nil;
    }

    let first = keys[0];
    let json = this.bucket.getJson(first);

    // delete the object from the bucket before returning to make sure no one uses it. if this request
    // fails, we will have a dangling unallocated instance, which we might need to garbage-collect, 
    // but least we won't have double-allocations.
    this.bucket.delete(first);

    return t.Host.fromJson(json);
  }

  pub inflight add(host: t.Host) {
    let key = "{this.prefixFor(host)}/{host.instanceId}";

    // TODO: this is a hack to get around the fact that we can't serialize the Instance type to JSON
    // because it has non-string keys. we need to find a better way to do this.
    this.bucket.putJson(key, unsafeCast(host));
  }

  inflight prefixFor(attrs: t.ClusterAttributes): str {
    return "{attrs.provider}/{attrs.region}/{attrs.size}";
  }
}
