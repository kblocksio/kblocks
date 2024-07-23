bring "cdk8s-plus-30" as k8s;
bring "cdk8s" as cdk8s;

pub struct WorkloadSpec {
  image: str;
  replicas: num?;
  port: num?;
  env: Map<str>?;
}

pub class Workload {
  new(opts: WorkloadSpec) {
    let d = new k8s.Deployment(replicas: opts.replicas);
    let c = d.addContainer(image: opts.image, portNumber: opts.port);
    
    for e in (opts.env ?? {}).entries() {
      c.env.addVariable(e.key, k8s.EnvValue.fromValue(e.value));
    }

    if let port = opts.port {
      d.exposeViaService(ports: [{ port }]);
    }
  }
}
