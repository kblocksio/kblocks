bring k8s;

pub struct WingKubernetesResourceSpec {
  hello: str;
}

pub class WingKubernetesResource {
  pub message: str;

  new(spec: WingKubernetesResourceSpec) {
    this.message = "{spec.hello} world";

    new k8s.ApiObject(
      apiVersion: "v1",
      kind: "ConfigMap",
      metadata: {
        name: "my-configmap",
      },
    );
  }
}