pub struct WingKubernetesResourceSpec {
  hello: str;
}

pub class WingKubernetesResource {
  pub message: str;

  new(spec: WingKubernetesResourceSpec) {
    this.message = "{spec.hello} world";
  }
}