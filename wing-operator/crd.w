bring "cdk8s" as cdk8s;

pub struct ResourceDefinition {
  group: str;
  version: str;
  kind: str;
  plural: str;
  singular: str?;
  categories: Array<str>?;
  listKind: str?;
  shortNames: Array<str>?;
}

pub struct CustomResourceProps {
  definition: ResourceDefinition;
  schema: Json;
}

pub class CustomResource {
  pub version: str;
  pub kind: str;
  pub apiVersion: str;
  pub group: str;
  pub plural: str;

  new(props: CustomResourceProps) {
    let def = props.definition;

    this.version = def.version;
    this.kind = def.kind;
    this.group = def.group;
    this.plural = def.plural;
    
    this.apiVersion = "{def.group}/{def.version}";


    new cdk8s.ApiObject(unsafeCast({
      apiVersion: "apiextensions.k8s.io/v1",
      kind: "CustomResourceDefinition",
      metadata: {
        name: "{def.plural}.{def.group}",
      },
      spec: {
        group: def.group,
        names: {
          kind: def.kind,
          listKind: def.listKind,
          shortNames: def.shortNames,
          plural: def.plural,
          singular: def.singular,
        },
        scope: "Namespaced",
        versions: [
          {
            name: def.version,
            served: true,
            storage: true,
            subresources: {
              status: {},
            },
            schema: {
              openAPIV3Schema: props.schema,
            },
          },
        ],
      }
    })) as "crd";
  }

}
