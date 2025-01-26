# Pulumi

This block type is backed by [Pulumi](https://pulumi.com/). It allows you to provision infrastructure resources using Pulumi configurations.

## Block Manifest

The `kblock.yaml` file defines the block manifest, containing block definitions like names, icons, description and optional operator environment settings.

## Input Schema

The input schema is defined in `src/values.schema.json`. Schema fields map to [Pulumi Configurations](https://www.pulumi.com/docs/iac/concepts/config/) defined in the current project.

## Implementation

The implementation is currently creating a new stack per block instance.

## Outputs

Outputs listed in `kblock.yaml` are read from [Pulumi Outputs](https://www.pulumi.com/docs/iac/concepts/inputs-outputs/) defined in your configuration. 