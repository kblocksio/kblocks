bring "cdk8s-plus-30" as k8s;

pub struct <%= spec.definition.kind %>Spec {
  myInput: str;
}

pub class <%= spec.definition.kind %> {
  pub myOutput: str;

  new(spec: <%= spec.definition.kind %>Spec) {

    let configMap = new k8s.ConfigMap(
      data: {
        "my-key": spec.myInput,
      }
    );

    this.myOutput = configMap.name;
  }
}