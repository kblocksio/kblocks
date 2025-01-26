# Helm

This block type is backed by a Helm chart. You can expose any [Helm](https://helm.sh/) chart as a kblock.

When a resource is created/updated, Kblocks will call `helm upgrade` and populate the `{{ Values }}` object based on the Kubernetes object desired state.

## Block Manifest

The `kblock.yaml` file defines the block manifest, containing block definitions like names, icons, description and optional operator environment settings.

## Input Schema

The input schema is defined in `src/values.schema.json`. Schema fields map to [Helm Values](https://helm.sh/docs/chart_template_guide/values_files/). For example, a schema field `myValue` can be referenced as `{{ .Values.myValue }}` in Helm templates.

Inputs are validated using [helm lint](https://helm.sh/docs/helm/helm_lint/) before upgrades.

The `{{ .Values.kblocks.system }}` value includes the Kblocks system identity.

## Implementation

- `src/Chart.yaml` - Standard [Helm chart manifest](https://helm.sh/docs/topics/charts/#the-chartyaml-file)
- `src/templates/` - Directory for YAML templates

## Outputs

Outputs defined in `kblock.yaml` are read from `src/templates/NOTES.txt` as a JSON object.

Example `NOTES.txt`:
```txt
{
  "myOutput": "{{ .Release.Name }}-is-the-awesome-output"
}
``` 