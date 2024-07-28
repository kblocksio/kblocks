# kblocks

kblocks is a tool for packaging Helm charts and IaC modules as native high-level Kubernetes objects.


## Installation

Clone this repo:

```sh
git clone git@github.com/winglang/kblocks.git
cd kblocks
```

Install deps:

```sh
npm i
```

## Setup Local Cluster

Create a `kind` cluster with a container image registry:

```sh
./scripts/reinstall-kind.sh
```

Install Crossplane (if needed):

```sh
./scripts/install-crossplane.sh
```

## Usage

The `kblocks.yaml` defines which resources to include in the package:

```yaml
include:
  - ./acme/bucket
  - ./acme/cron
  - ./acme/workload
```

This is basically a list of directories, each one has to include a `kblock.yaml` file.

The `kblock.yaml` file is the configuration for a single resource and includes the following fields:

- The `engine` field specifies how the resource is implemented.
- The `definition` field includes the CRD definition, without the schema.
- The `operator` field sets options for the generated Kubernetes operator.

## Helm Resources

You can expose any [helm](https://helm.sh/) chart as a kblock. See [acme/cron](./acme/cron/) as an
example.

When a kblock is updated, the controller will call `helm upgrade` a populate the `{{ Values }}`
object from the Kubernetes object desired state.

For example, [acme/cron/kblock.yaml](./acme/cron/kblock.yaml) specifies a helm resource:

```yaml
engine: helm
definition:
  group: acme.com
  version: v1
  kind: Cron
  plural: crons
  schema:
    properties:
      command:
        items:
          type: string
        type: array
      image:
        type: string
      schedule:
        type: string
    required:
      - schedule
      - image
      - command
    type: object
operator:
  namespace: acme-operators
  permissions:
    - apiGroups: ["*"]
      resources: ["*"]
      verbs: ["*"]
```

## Wing Resource

You can also implement kblocks using [Winglang](https://winglang.io) classes. 

The source directory includes `.w` files with a public class for each resource. It should also
include a `package.json` file the `@winglibs/k8s` dependency.

For example, [acme/workload/kblock.yaml] specifies a Wing-based resource called `Workload`:

```yaml
engine: wing
definition:
  group: acme.com
  version: v1
  kind: Workload
  plural: workloads
  singular: workload
  categories: 
    - all
  listKind: WorkloadList
  shortNames:
    - "wl"
operator:
  namespace: acme-operators
  permissions:
    - apiGroups: ["*"]
      resources: ["*"]
      verbs: ["*"]
```

By convention, the class name is the same as the `<kind>` and the CRD schema is generated from the
`<kind>Spec` struct.

For example, if the `kind` is `Workload`, then:

```js
pub struct WorkloadSpec {
  // this is the spec
}

pub class Workload {
  new(spec: WorkloadSpec) {

  }
}
```

## Build and Deployment

There's a simple CLI under `kblocks/bin/kblocks` which can be used to produce your kblocks helm package.

This script will call `kblocks build` and then install it via Helm:

```sh
./install.sh
```

## Roadmap

- [x] Report events such as compile/apply errors to parent resource
- [ ] Associate all child resources with the parent resource (`ownerReferences`?)
- [ ] Update status of parent object during deployment <-- this creates an update cycle
- [ ] Apply `annotations` to all child-resources
- [x] Purge label
- [x] Helm chart output
- [x] Apply labels to all child-resources.
- [x] Implement a resource using a Helm chart
- [ ] Implement a resource using a Terraform module
- [ ] Implement a resource using AWS CDK code
- [ ] Operator permissions
- [x] "Delete" should just delete all the resources based on the objectid label instead of synthesizing a manifest
- [ ] Apply the `wing.cloud/*` labels to all resources in the Helm engine (through a `--post-renderer`)

## Known Issues

- [ ] The "spec" struct must be called `XxxSpec` (we use this convention to find it).

## Acme Example

- [ ] Backstage
- [ ] Backstage widgets for resources
- [x] Implement a resource using a Helm chart
- [ ] Crossplane/ACK resource
- [ ] Terraform and/or CDK resource
