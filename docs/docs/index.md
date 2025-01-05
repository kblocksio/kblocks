---
sidebar_position: 1
---

# Introduction

Kblocks is a framework for building Kubernetes *custom resource operators* using familiar
infrastructure tools like [Helm](https://helm.sh/), [Terraform](https://www.terraform.io/),
[OpenTofu](https://opentofu.org/), [CDK8s](https://cdk8s.io/) and [Winglang](https://winglang.io/).

## How does it work?

To create a new block, all you need is:

1. Define the block API through a JSON Schema.
2. Choose the backing engine (e.g. Helm, Terraform, OpenTofu, Winglang, etc.)
3. Implement the block logic in the engine's language (e.g. Helm templates, Terraform config)
4. Run `kb build` to create an operator that can be deployed to a Kubernetes cluster.
5. Done!

## Features

- **Multiple Engines**: Support for Helm, Terraform, OpenTofu, Wing and custom implementations
- **Simple CLI**: Easy-to-use command line interface for creating and managing blocks
- **Schema Validation**: Automatic validation of custom resource inputs
- **Output Management**: Structured handling of block outputs
- **Kubernetes Native**: Fully integrated with Kubernetes custom resources
- **LLM-based Enrichment**: Automatically create documentation and other resources with information from LLM

## Quick Links

- [Getting Started](getting-started/index.md)
- [CLI Reference](cli-reference/index.md)
- [Supported Engines](engines/index.md) 
