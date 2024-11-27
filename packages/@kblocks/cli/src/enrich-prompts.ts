import { z } from "zod";
import { Manifest } from "@kblocks/api";

export const EnrichInput = z.object({
  manifest: z.custom<Manifest>(),
  sourceCode: z.record(z.string()),
});

const readmeDescription = {
  prompt: [
    "This project represents a 'platform building block' offered to developers by their platform engineering team, so they can be more independent and self-service.",
    "This is the main documentation (readme) for the resource, and displayed in the developer portal. It should be written in a way that is understandable to developers, not platform engineers or devops.",
    "The readme should be written in markdown format.",
    "The readme should describe the API of the resource (each field in the schema of the resource), the valid values and how to use them.",
    "Use the following template to structure the document.",
  ],

  template: [
    "# Resource Name (based on the 'Kind' of the resource)",
    "<one short sentence description of the resource>",
    "## Options",
    "<a description of the fields, their purpose, default values and their default values. Start with required fields and then describe optional fields.>",
    '## Examples in Kubernetes Manifests',
    "<2-3 examples of Kubernetes YAMLs which creates an instance of the resource for various use cases. Do not include a 'spec' property unless the CRD schema defines it explicitly>",
    "## Resources",
    "<a list of explicit kubernetes child resources and their names which created by the custom resource>",
    "## Behavior",
    `<a description of the behavior of the resource>`,
  ],
}

const iconDescription =[
  "A hero icon (https://heroicons.com/) to represent the resource described in the readme.",
  "The output should only include the identifier of the hero icon ([a-z0-9-]+).",
  "For example `arrow-down-on-square` without any wrapping information or quotes",
];

const schemaDescription = [
  "A copy of the JSON schema defined under 'manifest.definition.schema' with a 'description' property added to each field that describes the field in a way that is understandable to developers",
];

export const EnrichOutput = z.object({
  description: z.string({ description: "A short description of the resource" }),
  readme: z.string({ description: JSON.stringify(readmeDescription) }),
  icon: z.string({ description: JSON.stringify(iconDescription) }),
  schema: z.any({ description: JSON.stringify(schemaDescription) }),
});


export type EnrichInput = z.infer<typeof EnrichInput>;
export type EnrichOutput = z.infer<typeof EnrichOutput>;