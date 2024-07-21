bring "cdk8s" as cdk8s;
bring "cdk8s-plus-30" as k8s;
bring "./image.w" as i;
bring fs;
bring util;
bring "./crd.w" as crd;

pub struct OperatorOptions extends crd.CustomResourceOptions {
  libdir: str;
  namespace: k8s.Namespace?;
}

pub class Operator {
  new(options: OperatorOptions) {
    let kind = options.kind.lowercase();
    let image = "localhost:5001/wing-operator:{kind}";
    let namespace = options.namespace?.name;
    
    let c = new crd.CustomResource(options);
    
    new i.Image(image, apiVersion: c.apiVersion, kind: c.kind, libdir: options.libdir);
    
    let serviceAccount = new k8s.ServiceAccount(
      metadata: { namespace },
    );
    
    let role = new k8s.ClusterRole(
      rules: [
        {
          verbs: ["get", "watch", "list"],
          endpoints: [
            k8s.ApiResource.custom(
              apiGroup: c.group,
              resourceType: c.plural,
            )
          ],
        },

        // allow pod to apply any manifest to any namespace
        {
          verbs: ["create", "update", "patch", "delete", "get", "list", "watch"],
          endpoints: [
            k8s.ApiResource.custom(
              apiGroup: "*",
              resourceType: "*",
            )
          ],
        }
        
      ],
    );
    
    let binding = new k8s.ClusterRoleBinding(role: role);
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
  }
}
