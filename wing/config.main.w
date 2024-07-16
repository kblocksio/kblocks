bring "./lib.w" as l;
bring "cdk8s" as cdk8s;
bring "cdk8s-plus-30" as k8s;
bring "./image.w" as i;
bring fs;
bring util;
bring "./crd.w" as crd;

let image = "localhost:5001/wing-operator:latest";
let clusterRole = "wing-operator";
let serviceAccountName = "wing-operator-account";
let namespace = "wing-operator";

let c = new crd.CustomResource(
  group: "wing.cloud", 
  version: "v1", 
  kind: "Workload",
  singular: "workload",
  plural: "workloads",
  listKind: "WorkloadList",
  shortNames: ["wl"],
  schema: l.WorkloadSpec.schema(),
);

new i.Image(image, apiVersion: c.apiVersion, kind: c.kind);

new k8s.Namespace(metadata: { name: namespace });

let serviceAccount = new k8s.ServiceAccount(
  metadata: {
    name: serviceAccountName,
    namespace,
  }
) as "serviceAccount";


let role = new k8s.ClusterRole(
  metadata: { name: clusterRole },
  rules: [
    {
      verbs: ["get", "watch", "list"],
      endpoints: [
        k8s.ApiResource.custom(
          apiGroup: c.group,
          resourceType: c.plural,
        )
      ],
    }
  ],
);

let binding = new k8s.ClusterRoleBinding(
  metadata: { name: clusterRole },
  role: role,
);

binding.addSubjects(serviceAccount);

let controller = new k8s.Deployment(
  serviceAccount: serviceAccount,
  replicas: 1,
  automountServiceAccountToken: true,
  metadata: { namespace },
);

controller.addContainer(
  image: image,
  imagePullPolicy: k8s.ImagePullPolicy.ALWAYS,
  securityContext: {
    readOnlyRootFilesystem: false,
    ensureNonRoot: false,
  },
);