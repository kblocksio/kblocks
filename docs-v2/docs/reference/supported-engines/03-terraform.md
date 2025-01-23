# Terraform

This block type is backed by [Terraform](https://www.terraform.io/). It allows you to provision infrastructure resources using Terraform configurations.

## Block Manifest

The `kblock.yaml` file defines the block manifest, containing block definitions like names, icons, description and optional operator environment settings.

## Input Schema

The input schema is defined in `src/values.schema.json`. Schema fields map to [Terraform Variables](https://developer.hashicorp.com/terraform/language/values/variables) defined in `src/variables.tf`.

## Implementation

The `src/main.tf` file is the entrypoint for your Terraform configuration. This is a standard Terraform HCL config file.

## Outputs

Outputs listed in `kblock.yaml` are read from [Terraform Outputs](https://developer.hashicorp.com/terraform/language/values/outputs) defined in your configuration. 