bring "./wing-operator" as wop;
bring "./acme" as acme;
bring "cdk8s-plus-30" as k8s;

let ns = new k8s.Namespace(
  metadata: { name: "acme-operators" }
);

new wop.Operator(
  group: "acme.com", 
  version: "v1", 
  kind: "Workload",
  singular: "workload",
  plural: "workloads",
  listKind: "WorkloadList",
  shortNames: ["wl"],
  schema: acme.WorkloadSpec.schema(),
  libdir: "{@dirname}/acme",
  namespace: ns,
);

new wop.Operator(
  group: "acme.com", 
  version: "v1", 
  kind: "Eyal",
  singular: "eyal",
  plural: "eyals",
  listKind: "EyalList",
  shortNames: ["ey"],
  schema: acme.EyalSpec.schema(),
  libdir: "{@dirname}/acme",
  namespace: ns,
) as "eyal";
