# init

Initializes a new block project in a new directory.

```bash
kb init <TEMPLATE> <DIR> [options]
```

### Required

- `<TEMPLATE>`: The template to use for the block.
- `<DIR>`: The directory to initialize the block in.

### Optional

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

### Supported Project Templates

* `custom`: Block implemented using custom hooks for "create", "update" and "delete"
* `helm`: Helm is an open-source package manager for Kubernetes that allows you to
define, install, and upgrade even the most complex Kubernetes applications
* `noop`: Block with no operations
* `pulumi`: Pulumi is an open-source infrastructure provisioning engine.
* `terraform`: Terraform is an infrastructure as code software tool that
provides a consistent CLI workflow to manage hundreds of cloud providers.
* `tofu`: OpenTofu is an open-source infrastructure as code software tool that
enables you to manage your infrastructure as code
* `wing-k8s`: Helm is an open-source package manager for Kubernetes that allows you
to define, install, and upgrade even the most complex Kubernetes applications
