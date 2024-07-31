bring "cdk8s-plus-30" as k8s;
bring "cdk8s" as cdk8s;

pub struct RunSpec {
  image: str?;
  env: Map<str>?;
  envSecrets: Map<EnvSecret>?;
  command: Array<str>?;
}

pub struct EnvSecret {
  name: str;
  key: str;
}

pub class Run {
  new(spec: RunSpec) {
    let job = new k8s.Job();

    let c = job.addContainer(
      image: spec.image ?? "busybox", 
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
  }
}
