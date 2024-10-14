# <%= spec.definition.kind %> Block

This project is an example block backed by a Helm chart. You can expose any [Helm](https://helm.sh/) chart as a kblock.

When a resource is created/updated, Kblocks will call `helm upgrade` and populate the `{{ Values }}`
object based on the Kubernetes object desired state.

## Manifest

The `kblock.yaml` file defines the block manifest. This is where you can find the block definitions
such as names, icons and description as well as optional operator environment settings.

## Inputs

The file `src/values.schema.json` is where the input JSON schema of the block is defined. The schema
fields are mapped to [Helm Values](https://helm.sh/docs/chart_template_guide/values_files/).  For
example, if the schema contains a field called `myValue`, it can be refereced through `{{
.Values.myValue }}` in your Helm templates.

Inputs will be validated against the schem with [helm lint](https://helm.sh/docs/helm/helm_lint/)
which will be executed before `upgrade`.

## Implementation

The file `src/Chart.yaml` is a standard [Helm chart
manifest](https://helm.sh/docs/topics/charts/#the-chartyaml-file) and should define the name,
version and dependencies of the chart.

The `src/templates` directory is where you can put your YAML templates.

## Outputs

The set of outputs is defined in your `kblock.yaml` under `outputs`, and Kblocks expects to read
them by parsing the `src/templates/NOTES.txt` output as a `JSON` object.

> Yes, it's a bit of a hack.

For example, if our `kblocks.yaml` defines `outputs: ["myOutput"]` then the `NOTES.txt` file should
look like this:

```txt
{
  "myOutput": "{{ .Release.Name }}-is-the-awesome-output"
}
```
