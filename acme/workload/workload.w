bring "cdk8s-plus-30" as k8s;
bring "cdk8s" as cdk8s;

pub struct WorkloadSpec {
  image: str;
  replicas: num?;
  port: num?;
  env: Map<str>?;
  command: Array<str>?;
}

pub class Workload {
  new(spec: WorkloadSpec) {
    if let replicas = spec.replicas {
      if replicas < 2 {
        throw "replicas can't be less than 2";
      }
    }

    let d = new k8s.Deployment(
      replicas: spec.replicas,
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

    if let port = spec.port {
      d.exposeViaService(ports: [{ port }]);
    }

    let cfg = new k8s.ConfigMap(data: {
      barak: spec.image
    });

  }
}
