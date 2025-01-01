---
sidebar_position: 1
---

# init

Initializes a new block project in a directory.

```bash
kblocks init <TEMPLATE> <DIR> [options]
```

### Options
- `--group, -g`: Kubernetes custom resource group
- `--api-version, -v`: Kubernetes API version (default: "v1")
- `--kind, -k`: Custom resource kind
- `--plural, -p`: Custom resource plural name
- `--singular`: Singular name for the block
- `--icon`: Block icon
- `--color`: Block color style
- `--category`: Resource categories (can specify multiple)
- `--short-name`: Short names (can specify multiple)
- `--list-kind`: Kubernetes list kind
- `--description`: Block description
- `--import`: Import schema from Kubernetes 