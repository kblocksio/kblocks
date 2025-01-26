# install

Installs a block to a cluster.

```bash
kblocks install [DIR] [options]
```

### Options
- `--output, -o`: Output directory (default: "./dist")
- `--release-name`: Helm release name
- `--manifest, -m`: Block manifest file (default: "kblock.yaml")
- `--namespace, -n`: Target namespace
- `--env, -e`: Environment variables 