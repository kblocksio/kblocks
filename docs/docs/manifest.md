---
sidebar_position: 3
---

# Block Manifest

The `kblock.yaml` file defines the structure and configuration for a block. Below is a detailed
description of each field:

## Fields

### `include`

Specifies additional configuration files to include. This can be used to include multiple CRDs
within a single block operator.

For example:

```yaml
include:
  - foo/kblock.yaml
  - bar/kblock.yaml
```

### `engine`

Defines the engine to be used. See [Supported Engines](./engines) for details.

- `tofu`
- `helm`
- `wing`
- `wing/tf-aws`
- `wing/k8s`
- `cdk8s`
- `noop`
- `custom`

### `definition`

Defines the custom resource and additional metadata.

- **`schema`**: The OpenAPI schema of the resource. Normally this would be a reference to `src/values.schema.json`.
- **`readme`**: Optional string - A README file for the resource. Normally this would be a reference to `./README.md`.
- **`description`**: Optional string - A description of the resource.
- **`icon`**: Optional string - An icon representing the resource.
- **`color`**: Optional string - A color associated with the resource.

### `operator`

Defines the operator configuration (optional).

- **`namespace`**: Optional string - The namespace to deploy the operator.
- **`skipCrd`**: Optional boolean (default: false) - Whether to skip CRD creation. This should be
  used if the block operator manages native Kubernetes resources instead of custom resources.
- **`flushOnly`**: Optional boolean (default: false) - Whether to only flush changes.
- **`flushCrontab`**: Optional string - A crontab schedule for flushing.
- **`envSecrets`**: Optional union - Environment secrets.
- **`envConfigMaps`**: Optional record of strings - Environment config maps.
- **`env`**: Optional record of strings - Environment variables.
- **`workers`**: Optional number (default: 1) - Number of workers.
- **`permissions`**: Optional array of objects - Permissions required by the operator.
  - **`apiGroups`**: Array of strings - API groups.
  - **`resources`**: Array of strings - Resources.
  - **`verbs`**: Array of strings - Verbs.

### `control`

- **`git`**: Optional object - Git configuration.
  - **`repo`**: String - The repository URL.
  - **`branch`**: Optional string - The branch to use.
  - **`directory`**: Optional string - The directory within the repository.
  - **`createPullRequest`**: Optional boolean (default: false) - Whether to create a pull request.
