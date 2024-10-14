# <%= spec.definition.kind %> Block

This project is an example of a block backed by the [OpenTofu](https://opentofu.org/) engine.

## Manifest

The `kblock.yaml` file defines the block manifest. This is where you can find the block definitions
such as names, icons and description as well as optional operator environment settings.

## Inputs

The file `src/values.schema.json` is where the input JSON schema of the block is defined. The schema
fields are mapped to [Terraform
Variables](https://developer.hashicorp.com/terraform/language/values/variables) defined under
`src/variables.tf`.

## Implementation

The `src/main.tf` is the entrypoint of the Terraform configuration. This is a completely standard
Terraform HCL config.

## Outputs

The set of outputs is defined in your `kblock.yaml` under `outputs`, and Kblocks expects to read
them as [Terraform Outputs](https://developer.hashicorp.com/terraform/language/values/outputs).
