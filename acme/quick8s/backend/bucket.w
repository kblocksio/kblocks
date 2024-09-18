bring cloud;
bring aws;

// TODO: structural interfaces + cloud.IBucket would have made my life so much easier

pub interface IBucket {
  inflight list(prefix: str): Array<str>;
  inflight getJson(key: str): Json;
  inflight delete(key: str): void;
  inflight putJson(key: str, json: Json): void;
}

pub class CloudBucket impl IBucket {
  b: cloud.Bucket;
  
  new() {
    this.b = new cloud.Bucket();
  }

  pub inflight delete(key: str): void { this.b.delete(key); }
  pub inflight putJson(key: str, json: Json): void { this.b.putJson(key, json); }
  pub inflight list(prefix: str?): Array<str> { return this.b.list(prefix); }
  pub inflight getJson(key: str): Json { return this.b.getJson(key); }
}

pub class AwsBucketRef impl IBucket {
  b: aws.BucketRef;

  new(bucketName: str) {
    this.b = new aws.BucketRef(bucketName);
  }

  pub inflight list(prefix: str?): Array<str> { return this.b.list(prefix); }
  pub inflight getJson(key: str): Json { return this.b.getJson(key); }
  pub inflight delete(key: str): void { this.b.delete(key); }
  pub inflight putJson(key: str, json: Json): void { this.b.putJson(key, json); }
}
