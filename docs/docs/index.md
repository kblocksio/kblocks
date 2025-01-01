---
sidebar_position: 1
---

# Introduction

KBlocks is a framework for building Kubernetes operators using familiar infrastructure tools like Helm, Terraform, OpenTofu and Wing.

## What is KBlocks?

KBlocks allows you to create custom Kubernetes resources (CRDs) and implement their controllers using infrastructure tools you already know. Instead of writing complex Go operators, you can:

- Use Helm charts to template Kubernetes resources
- Use Terraform/OpenTofu to provision cloud resources 
- Use Wing to write type-safe infrastructure code
- Implement custom logic using any programming language

## Features

- **Multiple Engines**: Support for Helm, Terraform, OpenTofu, Wing and custom implementations
- **Simple CLI**: Easy-to-use command line interface for creating and managing blocks
- **Schema Validation**: Automatic validation of custom resource inputs
- **Output Management**: Structured handling of block outputs
- **Kubernetes Native**: Fully integrated with Kubernetes custom resources

## Quick Links

- [Getting Started](getting-started.md)
- [CLI Reference](cli-reference.md)
- [Block Types](block-types/index.md) 