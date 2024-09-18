pub enum Size {
  small,
  medium,
  large,
  xlarge,
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
  sshPrivateKey: str;
  registryPassword: str;
  publicIp: str;
}

pub struct Host extends ClusterAttributes {
  instanceId: str;
  publicIp: str;
  sshPrivateKey: str;
  kubeconfig: str;
  registryPassword: str;
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
}