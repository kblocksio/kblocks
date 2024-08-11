bring "cdk8s-plus-30" as k8s;
bring fs;

pub struct DocsProps {
  group: str;
  version: str;
  kind: str;
  namespace: str;
  readme: str;
  icon: str;
}

pub class Docs {
  pub name: str;

  new(dir: str, props: DocsProps) {
    let c = new k8s.ConfigMap(
      metadata: {
        namespace: props.namespace,
        name: "kblocks-{props.kind}-metadata",
      },
      data: {
        readme: fs.readFile("{dir}/{props.readme}"),
        icon: props.icon
      }
    );

    this.name = c.name;
  }
}
