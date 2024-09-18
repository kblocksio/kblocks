bring cloud;
bring "./names.w" as n;
bring "./types.w" as t;
bring "./clusters.w" as c;
bring "./api.w" as a;
bring "./pool.w" as p;
bring "./bucket.w" as b;
bring aws;

let s3Bucket = new b.AwsBucketRef("eladb-quick8s-pool");

new a.Api(
  user: "eladb@wing.cloud",
  clusters: new c.Clusters(),
  names: new n.NameGenerator(),
  pool: new p.Pool(bucket: s3Bucket),
);
