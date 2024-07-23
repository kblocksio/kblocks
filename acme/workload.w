bring "cdk8s-plus-30" as k8s;
bring "cdk8s" as cdk8s;

pub struct WorkloadSpec {
  image: str;
  replicas: num?;
  port: num?;
  env: Map<str>?;
}

pub class Workload {
  new(spec: WorkloadSpec) {
    let d = new k8s.Deployment(replicas: spec.replicas);
    let c = d.addContainer(image: spec.image, portNumber: spec.port);
   
    for e in (spec.env ?? {}).entries() {
      c.env.addVariable(e.key, k8s.EnvValue.fromValue(e.value));
    }

    if let port = spec.port {
      d.exposeViaService(ports: [{ port }]);
    }
  }
}
