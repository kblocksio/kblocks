bring "cdk8s-plus-30" as k8s;
bring "cdk8s" as cdk8s;

pub struct WorkloadSpec {
  image: str;
  replicas: num?;
  port: num?;
  env: Map<str>?;
  envSecrets: Map<EnvSecret>?;
  command: Array<str>?;
}

pub struct EnvSecret {
  name: str;
  key: str;
}

pub class Workload {
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
      d.exposeViaService(ports: [{ port }]);
    }
  }
}
