import { ConfigMap } from "cdk8s-plus-30";
import { Construct } from "constructs";
import fs from "fs";
import path from "path";

export interface BlockMetadataProps {
  resourceName: string;
  namespace?: string;
  kind: string;
  readme?: string;
  icon?: string;
}

export class BlockMetadata extends Construct {
  public readonly name: string;

  constructor(scope: Construct, id: string, props: BlockMetadataProps) {
    super(scope, id);

    const readme = props.readme ?? `# ${props.resourceName}`;
    const icon = props.icon ? props.icon : "cube";

    const cm = new ConfigMap(this, "Metadata", {
      metadata: {
        namespace: props.namespace,
        name: `kblocks-${props.kind.toLocaleLowerCase()}-metadata`,
      },
      data: {
        readme,
        icon,
      }
    });

    this.name = cm.name;
  }
}