bring "cdk8s-plus-30" as k8s;
bring "cdk8s" as cdk8s;
bring "./shared.w" as api;

pub struct WorkloadSpec extends api.ContainerSpec, api.PolicySpec {
  /// The number of replicas to create for this container
  replicas: num?;

  /// Ingress path for this workload. If specified, this workload will be exposed publicly.
  route: str?;

  /// Rewrite host header on backend 
  rewrite: str?;
}

pub class Workload {
  pub host: str?;
  pub port: str?;

  new(spec: WorkloadSpec) {

    let d = new k8s.Deployment(
      replicas: spec.replicas ?? 1,
      automountServiceAccountToken: true,
      serviceAccount: api.newServiceAccount(spec),
    );

    d.addContainer(api.newContainer(spec));

    if let port = spec.port {
      let service = d.exposeViaService(ports: [{ port }]);
      this.host = service.name;
      this.port = "{service.port}";

      if let route = spec.route {
        let ingress = new k8s.Ingress();
        ingress.addRule(route, k8s.IngressBackend.fromService(service), k8s.HttpIngressPathType.PREFIX);

        if let rewrite = spec.rewrite {
          ingress.metadata.addAnnotation("nginx.ingress.kubernetes.io/rewrite-target", rewrite);
        }
      }
    } else {
      if spec.route != nil {
        throw "Cannot specify 'path' without 'port'";
      }
    }
  }
}
