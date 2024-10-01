bring k8s;

pub struct TestResourceSpec {
  hello: str;
}

pub class TestResource {
  pub message: str;

  new(spec: TestResourceSpec) {
    this.message = "{spec.hello} world";

    new k8s.ApiObject(
      apiVersion: "v1",
      kind: "ConfigMap",
      metadata: {
        name: "test-resource",
      },
    );
  }
}