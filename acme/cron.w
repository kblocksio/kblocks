bring k8s;
bring "cdk8s" as cdk8s;

pub struct CronSpec {
  schedule: str;
  image: str;
  command: Array<str>?;
}

pub class Cron {
  new(spec: CronSpec) {
    new cdk8s.Helm(
      chart: "{@dirname}/cron",
      values: unsafeCast(spec),
    );
  }
}