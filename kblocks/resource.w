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
  envSecrets: Map<str>?;
  envConfigMaps: Map<str>?;
  env: Map<str>?;
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
    let image = "kind-registry:5001/kblocks:{kind}-{util.nanoid()}";

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
    
    let container = controller.addContainer(
      image: image,
      imagePullPolicy: k8s.ImagePullPolicy.ALWAYS,
      resources: {
        cpu: {
          request: k8s.Cpu.millis(100),
          limit: k8s.Cpu.units(1),
        },
      },
      securityContext: {
        readOnlyRootFilesystem: false,
        ensureNonRoot: false,
      },
    );

    for x in (props.operator.envSecrets ?? {}).entries() {
      let secret = k8s.Secret.fromSecretName(this, "credentials-{x.key}-{x.value}", x.value);
      container.env.addVariable(x.key, k8s.EnvValue.fromSecretValue(k8s.SecretValue{ secret, key: x.key }));
    }

    for x in (props.operator.envConfigMaps ?? {}).entries() {
      let cm = k8s.ConfigMap.fromConfigMapName(this, "configmaps-{x.key}-{x.value}", x.value);
      container.env.addVariable(x.key, k8s.EnvValue.fromConfigMap(cm, x.key));
    }

    for y in (props.operator.env ?? {}).entries() {
      container.env.addVariable(y.key, k8s.EnvValue.fromValue(y.value));
    }

    container.env.addVariable("KBLOCK_OUTPUTS", k8s.EnvValue.fromValue((props.definition.outputs ?? []).join(",")));
  }

  resolveSchema(sourcedir: str, props: ResourceProps): Json {
    // in an explicit schema is set, use it.
    if let s = props.definition.schema {
      return s;
    }

    // otherwise, try to figure it out based on the engine
    let engine = props.engine;

    if engine == "wing" || engine.startsWith("wing/") {
      return Resource.generateSchemaFromWingStruct(sourcedir, "{props.definition.kind}Spec");
    } elif engine == "helm" {
      let f = "{sourcedir}/values.schema.json";
      if !fs.exists(f) {
        log("warning: values.schema.json not found");
        return {
          type: "object",
          properties: {},
        };
      }

      let x = MutJson fs.readJson(f);
      x.delete("$schema");

      return x;
    } else {
      throw "unsupported engine: {engine}";
    }
  }

  extern "./util.js" static generateSchemaFromWingStruct(source: str, structName: str): Json;
}