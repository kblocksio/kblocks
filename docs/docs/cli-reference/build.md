---
sidebar_position: 2
---

# build

Builds a Helm chart for a block operator.

```bash
kblocks build [DIR] [options]
```

### Options
- `--output, -o`: Output directory for the Helm chart (default: "./dist")
- `--manifest, -m`: Block manifest file (default: "kblock.yaml")
- `--env, -e`: Environment variables for the build environment 