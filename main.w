bring "./wing-operator" as wop;
bring "./acme" as acme;

new wop.Operator(
  group: "wing.cloud", 
  version: "v1", 
  kind: "Workload",
  singular: "workload",
  plural: "workloads",
  listKind: "WorkloadList",
  shortNames: ["wl"],
  schema: acme.WorkloadSpec.schema(),
);
