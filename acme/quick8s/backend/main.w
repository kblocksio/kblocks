bring cloud;
bring "./names.w" as n;
bring "./types.w" as t;
bring "./clusters.w" as c;
bring "./api.w" as a;
bring "./pool.w" as p;

new a.Api(
  user: "eladb@wing.cloud",
  clusters: new c.Clusters(),
  names: new n.NameGenerator(),
  pool: new p.Pool(),
);
