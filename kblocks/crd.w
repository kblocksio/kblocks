bring "cdk8s" as cdk8s;

pub struct CustomResourceProps {
  group: str;
  version: str;
  kind: str;
  plural: str;
  singular: str?;
  categories: Array<str>?;
  listKind: str?;
  shortNames: Array<str>?;
  schema: Json?;
  outputs: Array<str>?;
}

pub class CustomResource {
  pub version: str;
  pub kind: str;
  pub apiVersion: str;
  pub group: str;
  pub plural: str;

  new(props: CustomResourceProps) {
    let def = props;

    this.version = def.version;
    this.kind = def.kind;
    this.group = def.group;
    this.plural = def.plural;
    
    this.apiVersion = "{def.group}/{def.version}";

    if props.schema == nil {
      throw "schema is required";
    }

    let schema = MutJson props.schema;
    let properties = schema.get("properties");

    if properties.has("status") {
      throw "'status' property already exists";
    }

    properties.set("status", {
      type: "object",
      properties: {
        conditions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string" },
              status: { type: "string" },
              lastTransitionTime: { type: "string", format: "date-time" },
              lastProbeTime: { type: "string", format: "date-time" },
              message: { type: "string" },
            },
            required: ["type", "status", "lastTransitionTime"],
          },
        },
      }
    });

    let printerColumns = MutArray<Json>[];

    printerColumns.push({
      name: "Ready",
      type: "string",
      description: "Is resource ready",
      jsonPath: ".status.conditions[0].status",
    });

    printerColumns.push({
      name: "Status",
      type: "string",
      description: "The status of the resource",
      jsonPath: ".status.conditions[0].message",
    });

    if let outputs = props.outputs {
      let p = properties.get("status").get("properties");
      for o in outputs {
        p.set(o, { type: "string" });
        printerColumns.push({
          name: o,
          type: "string",
          description: o,
          jsonPath: ".status." + o,
        });
      }
    }

    // it's implicit
    properties.delete("metadata");  

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
            additionalPrinterColumns: printerColumns.copy(),
          },
        ],
      }
    })) as "crd";
  }

}
