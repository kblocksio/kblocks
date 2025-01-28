---
sidebar_position: 1
title: Introduction
id: introduction
slug: /
sidebar_label: Introduction
description: Understanding Kblocks, how it works and how to get started
keywords: [Kblocks, Kubernetes, Helm, Terraform, OpenTofu, Winglang, Pulumi]
---

Kblocks is a framework for building Kubernetes *custom resource operators* using familiar
infrastructure tools like [Helm](https://helm.sh/), [Terraform](https://www.terraform.io/), [Pulumi](https://www.pulumi.com/),
[OpenTofu](https://opentofu.org/), [CDK8s](https://cdk8s.io/) and [Winglang](https://winglang.io/).

### How does it work?

To create a new block, all you need is:

1. Define the block API through a JSON Schema.
2. Choose the backing engine (e.g. Helm, Terraform, OpenTofu, Winglang, etc.)
3. Implement the block logic in the engine's language (e.g. Helm templates, Terraform config)
4. Run `kb build` to create an operator that can be deployed to a Kubernetes cluster.
5. Install the operator to your Kubernetes cluster through Helm.
6. Done! Now your cluster has a new resource backed by Helm or Terraform.

### Features

- **Multiple Engines**: Support for Helm, Terraform, Pulumi, OpenTofu, Wing and custom script implementations
- **Simple CLI**: Easy-to-use command line interface for building and deploying blocks
- **Schema Validation**: Automatic validation of custom resource inputs
- **Output Management**: Structured handling of block outputs
- **Kubernetes Native**: Fully integrated with Kubernetes custom resources
- **LLM-based Enrichment**: Automatically create documentation and other resources with information from LLM

### Quick Links

- [Installation](/docs/user-guide/01-installation.md)
- [CLI Reference](/docs/reference/command-line-tool/01-intro.md)
- [Supported Engines](/docs/reference/supported-engines/01-index.md) 
