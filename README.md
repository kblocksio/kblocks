# Kblocks

Kblocks is a tool for creating platform building blocks using any IAC engine or Helm charts and
packaging them as Kubernetes custom resources.

## Prerequisites

Install the following:

- node
- docker
- kind
- kubectl
- helm

## Installation

Install the CLI:

```sh
npm i -g @kblocks/cli
```

Verify installation:

```sh
kb --version
0.223.0
```

## Creating new blocks

The `kb init` command can be used to create a new block project from a variety of project types.

To view the list of possible project types, run:

```sh
kb init --help

...

custom: Block implemented using custom hooks for "create", "update" and "delete"

helm: Helm is an open-source package manager for Kubernetes that allows you to
define, install, and upgrade even the most complex Kubernetes applications.

terraform: Terraform is an open-source infrastructure as code software tool that
provides a consistent CLI workflow to manage hundreds of cloud providers.

tofu: OpenTofu is an open-source infrastructure as code software tool that
enables you to manage your infrastructure as code.

wing-k8s: Winglang is an open-source programming language that enables you to
build cloud applications.
```

After you create a block project, check out it's **README** file. It will include detailed
information on how to define and implement your block, based on the underlying engine.

## Building and installing your block to a cluster

The following command will build a Helm chart for your block:

```sh
kb build
```

The chart will go under `dist/` and can be installed using Helm.

You can also use this command to build and install/upgrade:

```sh
kb install
```

## Creating resources

Once a block is installed to your cluster, it becomes a native Kubernetes resource and can be used
from the Kubernetes control plane. For example, you can apply it using `kubectl apply`, put it in
Helm charts, view it in [k9s](https://k9scli.io/), etc.

## Development

Clone this repo:

```sh
git clone git@github.com/winglang/kblocks.git
cd kblocks
```

Install deps:

```sh
npm i
```

1. You'll nee a Kubernetes cluster, you can get one from [quickube](https://quickube.sh):

```sh
qkube new --size small
```

2. Build & Deploy to the Cluster

> We have a [skaffold](https://skaffold.dev/) setup.

```sh
npm run dev
```

3. Add test resources

Use `kubectl`:

```sh
kubectl apply -f test/examples/
```

4. Monitor logs

`npm run dev` will tail logs and you should be able to see how these resources are deployed.

## Advanced Topics

An output can be referenced from another kblock through the syntax:

```
ref://queues.acme.com/my-queue/queueUrl
```

If the worker encounters this token when reconciling a resource, it will first wait for the
referenced resource to be ready and then it will read the value from it's state and replace it in
the manifest being reconciled.

## License

This software is proprietary and confidential. Unauthorized copying, distribution, or use of this
software, via any medium, is strictly prohibited.

All rights reserved. No part of this software may be reproduced, distributed, or transmitted in any
form or by any means, including photocopying, recording, or other electronic or mechanical methods,
without the prior written permission of the copyright holder, except in the case of brief quotations
embodied in critical reviews and certain other noncommercial uses permitted by copyright law.

For permission requests, please contact the copyright holder.

© 2024 Wing Cloud, Inc. All rights reserved.
