pub enum Size {
  small,
  medium,
  large,
  xlarge,
}

pub struct InstanceType {
  provider: Provider;
  size: Size;
  name: str;
  dailyCost: num;
  monthlyCost: num;
  vcpu: num;
  memory: num;
}


pub enum Provider {
  aws,
  gcp,
  azure
}

pub struct ClusterOptions {
  size: Size?;
  region: str?;
  provider: Provider?;
}

// TODO: something like TypeScript's Required<T>
pub struct ClusterAttributes {
  size: Size;
  region: str;
  provider: Provider;
}

pub struct Cluster extends ClusterAttributes {
  name: str;
  hostname: str;
  kubeconfig: Json;
  host: Host;
}

pub struct Host extends ClusterAttributes {
  instanceId: str;
  publicIp: str;
  publicDns: str;
  
  // targetGroupArn: str;
  sshPrivateKey: str;
  kubeconfig: str;
  registryPassword: str;
  instanceType: InstanceType;
}

pub struct ClusterList {
  clusters: Array<str>;
}



pub class Defaults {
  pub static inflight region(): str {
    return "us-east-1";
  }

  pub static inflight provider(): Provider {
    return Provider.aws;
  }

  pub static inflight size(): Size {
    return Size.medium;
  }

  pub static instanceTypes(): Array<InstanceType> {
    return [
      { size: Size.small, name: "t4g.small", dailyCost: 0.2016, monthlyCost: 6.13, vcpu: 2, memory: 2, provider: Provider.aws   },
      { size: Size.medium, name: "t4g.medium", dailyCost: 0.4032, monthlyCost: 12.26, vcpu: 2, memory: 4, provider: Provider.aws },
      { size: Size.large, name: "t4g.xlarge", dailyCost: 1.6128, monthlyCost: 49.06, vcpu: 4, memory: 16, provider: Provider.aws },
      { size: Size.xlarge, name: "t4g.2xlarge", dailyCost: 3.2256, monthlyCost: 98.11, vcpu: 8, memory: 32, provider: Provider.aws },
    ];
  }
}