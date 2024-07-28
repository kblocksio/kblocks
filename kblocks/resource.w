bring "cdk8s" as cdk8s;
bring "cdk8s-plus-30" as k8s;
bring "./image.w" as i;
bring "./crd.w" as crd;
bring fs;
bring util;

pub struct ResourceProps {
  engine: str;
  definition: crd.CustomResourceProps;
  operator: ResourceOperator;
}

pub struct ResourceOperator {
  namespace: str;
  permissions: Array<Permission>;
}

pub struct Permission {
  apiGroups: Array<str>;
  resources: Array<str>;
  verbs: Array<str>;
}

pub class Resource {
  new(sourcedir: str, props: ResourceProps) {
    let def = MutJson props.definition;

    let kind = props.definition.kind.lowercase();
    let image = "localhost:5001/wing-operator:{kind}-{util.nanoid()}";

    let schema = this.resolveSchema(sourcedir, props);
    def.set("schema", schema);

    let c = new crd.CustomResource(crd.CustomResourceProps.fromJson(def));
    
    new i.Image(image, 
      apiVersion: c.apiVersion, 
      kind: c.kind, 
      engine: props.engine,
      source: sourcedir
    );

    let serviceAccount = new k8s.ServiceAccount(
      metadata: {
        namespace: props.operator.namespace,
      }
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
          verbs: ["*"],
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
      metadata: {
        namespace: props.operator.namespace,
        name: "{kind}-controller",
      },
      serviceAccount: serviceAccount,
      replicas: 1,
      automountServiceAccountToken: true,
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

  resolveSchema(sourcedir: str, props: ResourceProps): Json {
    let engine = props.engine;

    if engine == "wing" {
      return Resource.generateSchemaFromWingStruct(sourcedir, "{props.definition.kind}Spec");
    } elif engine == "helm" {
      if let s = props.definition.schema {
        return s;
      } else {
        throw "'schema' field is required for 'helm' resources";
      }
    } else {
      throw "unsupported engine: {engine}";
    }
  }

  extern "./util.js" static generateSchemaFromWingStruct(source: str, structName: str): Json;
}