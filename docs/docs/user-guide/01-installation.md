---
sidebar_position: 1
title: Installation
id: installation
sidebar_label: Installation
description: Installation
keywords: [Kblocks, Kubernetes, Helm, Terraform, OpenTofu, Winglang]
---
# Installation

## Prerequisites

Before using Kblocks, ensure you have these installed on your system:

- [Node.js 20.x](https://nodejs.org/en/download/) (to run the CLI)
- [`helm`](https://helm.sh/docs/intro/install/) v3+ installed (to install block operators)
- Kubernetes cluster access with [`kubectl`](https://kubernetes.io/docs/tasks/tools/) installed and configured
- Any credentials needed to provision resources on the cloud (e.g. AWS credentials) stored in your cluster

## Install the CLI

Install the Kblocks CLI using npm:

```bash
npm i -g @kblocks/cli
``` 

## Verify the installation

```bash
kb --version
```

This should output the version of the CLI. 
