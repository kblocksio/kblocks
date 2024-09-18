bring cloud;
bring "./names" as names;
bring "./types.w" as t;
bring "./clusters.w" as c;
bring "./api.w" as a;
bring "./pool.w" as p;
bring "./bucket.w" as b;
bring "./dns" as d;
bring aws;

let s3Bucket = new b.AwsBucketRef("eladb-quick8s-pool");

let dns = new d.Route53(
  hostedZoneId: "Z0610680182K8KUPK23FC",
  domainName: "quick8s.sh",  
);

new a.Api(
  user: "eladb@wing.cloud",
  clusters: new c.Clusters(),
  names: new names.NameGenerator(),
  pool: new p.Pool(bucket: s3Bucket),
  dns: dns,
);
