import { Construct } from 'constructs';
import { JsonSchemaProps } from "../imports/k8s";
import { ApiObject } from 'cdk8s';
import { Manifest, TFSTATE_ATTRIBUTE } from '@kblocks/api';

export interface CustomResourceDefinitionProps {
  version: string;
  kind: string;
  group: string;
  plural: string;
  schema: JsonSchemaProps;
  listKind?: string;
  shortNames?: string[];
  singular?: string;
  outputs?: string[];
  annotations?: Record<string, string>;
  engine: Manifest["engine"];
}

export class CustomResourceDefinition extends Construct {

  public readonly version: string;
  public readonly kind: string;
  public readonly group: string;
  public readonly plural: string;

  constructor(scope: Construct, id: string, props: CustomResourceDefinitionProps) {
    super(scope, id);

    this.version = props.version;
    this.kind = props.kind;
    this.group = props.group;
    this.plural = props.plural;

    if (!props.schema) {
      throw "schema is required";
    }

    const additionalPrinterColumns = [];

    const status = {
      type: "object",
      properties: {
        lastStateHash: { 
          type: "string",
          description: "The hash of the last object state.\n\n@ui hidden",
        },
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
              reason: { type: "string" },
            },
            required: ["type", "status", "lastTransitionTime"],
          },
        },
      }
    };

    const statusProperties: Record<string, JsonSchemaProps> = status.properties;
    
    if (props.engine === "tofu" || props.engine.startsWith("wing/tf-")) {
      statusProperties[TFSTATE_ATTRIBUTE] = { 
        type: "string",
        description: "The last Terraform state of the resource.\n\n@ui hidden",
      };
    }

    additionalPrinterColumns.push({
      name: "Ready",
      type: "string",
      description: "Is resource ready",
      jsonPath: ".status.conditions[0].status",
    });

    additionalPrinterColumns.push({
      name: "Status",
      type: "string",
      description: "The status of the resource",
      jsonPath: ".status.conditions[0].message",
    });

    for (const k of Object.keys(props.schema.properties?.status?.properties ?? {})) {
      if (!props.outputs?.includes(k)) {
        throw new Error(`output ${k} is defined in the schema's status but not in kblocks outputs`);
      }
    }

    if (props.outputs) {
      for (const o of props.outputs) {
        statusProperties[o] = { type: "string" };
        additionalPrinterColumns.push({
          name: o,
          type: "string",
          description: o,
          jsonPath: ".status." + o,
        });
      }
    }

    const schema: JsonSchemaProps = {
      ...props.schema,
      properties: {
        ...props.schema.properties,
        status,
      },
    }

    // it's implicit
    delete schema.properties?.metadata;

    new ApiObject(this, "crd", {
      apiVersion: "apiextensions.k8s.io/v1",
      kind: "CustomResourceDefinition",
      metadata: {
        name: `${props.plural}.${props.group}`,
        annotations: props.annotations,
      },
      spec: {
        group: props.group,
        names: {
          kind: props.kind,
          listKind: props.listKind,
          shortNames: props.shortNames,
          plural: props.plural,
          singular: props.singular,
        },
        scope: "Namespaced",
        versions: [
          {
            name: props.version,
            served: true,
            storage: true,
            subresources: {
              status: {},
            },
            schema: {
              openAPIV3Schema: schema,
            },
            additionalPrinterColumns,
          },
        ],
      }
    });
  }
}