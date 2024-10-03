import { ConfigMap } from "cdk8s-plus-30";
import { Construct } from "constructs";

export interface BlockMetadataProps {
  resourceName: string;
  namespace?: string;
  kind: string;
  readme?: string;
  icon?: string;
  description?: string;
  color?: string;
}

export class BlockMetadata extends Construct {
  public readonly name: string;

  constructor(scope: Construct, id: string, props: BlockMetadataProps) {
    super(scope, id);

    const readme = props.readme ?? `# ${props.resourceName}`;
    const icon = props.icon ? props.icon : "cube";
    const description = props.description ? props.description : "No description provided";
    const color = props.color ? props.color : "#000000";

    const cm = new ConfigMap(this, "Metadata", {
      metadata: {
        namespace: props.namespace,
        name: `kblocks-${props.kind.toLocaleLowerCase()}-metadata`,
      },
      data: {
        readme,
        icon,
        description,
        color,
      }
    });

    this.name = cm.name;
  }
}