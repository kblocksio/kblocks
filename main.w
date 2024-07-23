bring "./wing-operator" as wop;
bring "./acme" as acme;
bring "cdk8s-plus-30" as k8s;

let group = "acme.com";

let ns = new k8s.Namespace(
  metadata: { name: "acme-operators" }
);

new wop.Operator(
  group: group, 
  version: "v1", 
  kind: "Workload",
  plural: "workloads",
  singular: "workload",
  categories: ["all"],
  listKind: "WorkloadList",
  shortNames: ["wl"],
  schema: acme.WorkloadSpec.schema(),
  libdir: "{@dirname}/acme",
  namespace: ns,
);

new wop.Operator(
  group: group,
  version: "v1",
  kind: "Cron",
  plural: "crons",
  schema: acme.CronSpec.schema(),
  libdir: "{@dirname}/acme",
  namespace: ns,
) as "cron";

new wop.Operator(
  group: group,
  version: "v1",
  kind: "Bucket",
  schema: acme.BucketSpec.schema(),
  plural: "buckets",
  libdir: "{@dirname}/acme",
  namespace: ns,
) as "bucket";