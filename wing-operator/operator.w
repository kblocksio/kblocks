bring "cdk8s" as cdk8s;
bring "cdk8s-plus-30" as k8s;
bring "./image.w" as i;
bring fs;
bring util;
bring "./crd.w" as crd;

pub struct OperatorOptions extends crd.CustomResourceOptions {
  
}

pub class Operator {
  new(options: OperatorOptions) {
    let image = "localhost:5001/wing-operator:latest";
    let namespace = "wing-operator";
    
    let c = new crd.CustomResource(options);
    
    new i.Image(image, apiVersion: c.apiVersion, kind: c.kind);
    
    new k8s.Namespace(metadata: { name: namespace });
    
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
