bring "cdk8s-plus-30" as k8s;
bring "cdk8s" as cdk8s;
bring "./workload" as api;

/// The specification for a run workload
pub struct RunSpec extends api.PolicySpec, api.ContainerSpec {
  /// The number of retries to attempt before giving up
  retries: num?;
}

/// A workload that runs a job
pub class Run {
  new(spec: RunSpec) {
    let job = new k8s.Job(
      backoffLimit: spec.retries ?? 10,
      serviceAccount: api.newServiceAccount(spec),
      automountServiceAccountToken: true,
    );

    job.addContainer(api.newContainer(spec));
  }
}
