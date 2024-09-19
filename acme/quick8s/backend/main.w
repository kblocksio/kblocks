bring cloud;
bring "./names" as names;
bring "./types.w" as t;
bring "./clusters.w" as c;
bring "./api.w" as a;
bring "./pool.w" as p;
bring "./bucket.w" as b;
bring "./dns" as d;
bring aws;
bring util;

// TODO: yakk!

let pool = () => {
  if util.env("WING_TARGET") == "sim" {
    return new b.SimulatedPoolBucket();
  } else {
    return new b.AwsBucketRef("eladb-quick8s-pool");
  }
}();

let dns = () => {
  if util.env("WING_TARGET") == "sim" {
    return new d.DnsSimulation();
  } else {
    return new d.Dnsimple(
      token: new cloud.Secret(name: "DNSIMPLE_TOKEN"),
      accountId: "137210",
      domain: "quick8s.sh",
    );
  }
}();

new a.Api(
  user: "eladb@wing.cloud",
  clusters: new c.Clusters(),
  names: new names.NameGenerator(),
  pool: new p.Pool(bucket: pool),
  dns: dns,
  customDomain: {
    cname: "api",
    zoneName: "quick8s.sh",
    certificateArn: "arn:aws:acm:us-east-1:248020555503:certificate/cfddf2f5-0245-49e6-8676-1e1fa3d1a1d4",
    dnsimpleAccountId: "137210",
  },
);
