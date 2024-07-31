bring "cdk8s-plus-30" as k8s;
bring "cdk8s" as cdk8s;

pub struct RunSpec {
  image: str?;
  env: Map<str>?;
  envSecrets: Map<EnvSecret>?;
  command: Array<str>?;
  readiness: Array<str>?;
  retries: num?;
}

pub struct EnvSecret {
  name: str;
  key: str;
}

pub class Run {
  new(spec: RunSpec) {
    let job = new k8s.Job(
      backoffLimit: spec.retries ?? 10,
    );

    let c = job.addContainer(
      image: spec.image ?? "busybox", 
      command: spec.command,
      readiness: () => {
        if let readiness = spec.readiness {
          return k8s.Probe.fromCommand(readiness);
        } else {
          return nil;
        }
      }(),
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
