bring "cdk8s-plus-30" as k8s;
bring "cdk8s" as cdk8s;

pub struct WorkloadSpec {
  image: str;
  replicas: num?;
  port: num?;
  env: Map<str>?;
  envSecrets: Map<EnvSecret>?;
  command: Array<str>?;

  /// Ingress path for this workload. If specified, this workload will be exposed publicly.
  route: str?;
}

pub struct EnvSecret {
  name: str;
  key: str;
}

pub class Workload {
  pub host: str?;
  pub port: str?;

  new(spec: WorkloadSpec) {
    let d = new k8s.Deployment(
      replicas: spec.replicas ?? 1,
      automountServiceAccountToken: true,
    );

    let c = d.addContainer(
      image: spec.image, 
      portNumber: spec.port, 
      command: spec.command,
      securityContext: {
        readOnlyRootFilesystem: false,
        ensureNonRoot: false,
      },
    );
   
    for e in (spec.env ?? {}).entries() {
      c.env.addVariable(e.key, k8s.EnvValue.fromValue(e.value));
    }

    for e in (spec.envSecrets ?? {}).entries() {
      let secret = k8s.Secret.fromSecretName(this, "credentials-{e.key}-{e.value.name}-{e.value.name}", e.value.name);
      c.env.addVariable(e.key, k8s.EnvValue.fromSecretValue(k8s.SecretValue { secret, key: e.value.key }));
    }

    if let port = spec.port {
      let service = d.exposeViaService(ports: [{ port }]);
      this.host = service.name;
      this.port = "{service.port}";

      if let route = spec.route {
        let ingress = new k8s.Ingress();
        ingress.metadata.addAnnotation("nginx.ingress.kubernetes.io/rewrite-target", "/");
        ingress.addRule(route, k8s.IngressBackend.fromService(service), k8s.HttpIngressPathType.PREFIX);
      }
    } else {
      if spec.route != nil {
        throw "Cannot specify 'path' without 'port'";
      }
    }
  }
}
