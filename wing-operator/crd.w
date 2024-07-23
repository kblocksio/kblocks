bring "cdk8s" as cdk8s;

// TODO: missing MutJson.copy() and Json.copyMut()

pub struct CustomResourceOptions {
  group: str;
  version: str;
  kind: str;
  singular: str?;
  plural: str;
  listKind: str?;
  categories: Array<str>?;
  shortNames: Array<str>?;
  schema: std.JsonSchema;
}

pub class CustomResource {
  pub version: str;
  pub kind: str;
  pub apiVersion: str;
  pub group: str;
  pub plural: str;

  new(options: CustomResourceOptions) {
    this.version = options.version;
    this.kind = options.kind;
    this.group = options.group;
    this.plural = options.plural;
    
    this.apiVersion = "{options.group}/{options.version}";

    let schema = CustomResource.cleanupSchema(Json.parse(options.schema.asStr()));

    new cdk8s.ApiObject(unsafeCast({
      apiVersion: "apiextensions.k8s.io/v1",
      kind: "CustomResourceDefinition",
      metadata: {
        name: "{options.plural}.{options.group}",
      },
      spec: {
        group: options.group,
        names: {
          kind: options.kind,
          listKind: options.listKind,
          shortNames: options.shortNames,
          plural: options.plural,
          singular: options.singular,
        },
        scope: "Namespaced",
        versions: [
          {
            name: options.version,
            served: true,
            storage: true,
            subresources: {
              status: {},
            },
            schema: {
              openAPIV3Schema: {
                type: "object",
                properties: {
                  spec: schema,
                  status: {
                    type: "object",
                    additionalProperties: true,
                  }
                }  
              }
            },
          },
        ],
      }
    })) as "crd";
  }

  extern "./util.js" static cleanupSchema(schema: Json): Json;
}
