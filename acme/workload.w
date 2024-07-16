bring "cdk8s-plus-30" as k8s;

pub struct WorkloadSpec {
  image: str;
  replicas: num?;
}

pub class Workload {
  new(opts: WorkloadSpec) {
    let d = new k8s.Deployment(replicas: opts.replicas);
    d.addContainer(image: opts.image);
  }
}
