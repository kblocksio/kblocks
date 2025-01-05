# Installation

## Prerequisites

Before using Kblocks, ensure you have these installed on your system:

- Kubernetes cluster access
- [`kubectl`](https://kubernetes.io/docs/tasks/tools/) installed and configured
- [`helm`](https://helm.sh/docs/intro/install/) v3+ installed (for Helm-based blocks)
- [Node.js 20.x](https://nodejs.org/en/download/) (for development)
- [Terraform](https://developer.hashicorp.com/terraform/downloads) or [OpenTofu](https://opentofu.org/downloads) installed.
- Any credentials needed to provision resources on the cloud (e.g. AWS credentials)

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