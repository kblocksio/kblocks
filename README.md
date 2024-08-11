 kblocks

kblocks is a tool for packaging Helm charts and IaC modules as native high-level Kubernetes objects.

## Prerequisites

Install the following:

- node
- docker
- kind
- kubectl
- helm

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

## Setup

### Development Cluster

See [Cluster Setup](./docs/cluster.md) for instructions on how to setup your development cluster
either locally or remotely.

### Slack Notifications

You will need to create a Slack channel called `#kblocks-dev-$USER` and invite `@MonadaCo Platform`
to it in order to receive notifications from your local cluster.

## Build & Install the Acme Operators

This script will build a helm chart with your operators and install them into your Kubernetes
cluster. Note that images are going to be pushed to `kind-registry:5001`.

```sh
./install.sh
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

## Resource documentation

- The `definition.readme` field points to a README file for this resource.
- The `definition.icon` field indicates the [heroicon](https://heroicons.com/) to use.

You can use `kblocks docs` to generate an initial README and suggest an icon for your kblock.

For each kblock, a `kblocks-xxx-metadata` ConfigMap will be deployed and will include the contents
of the README and the icon.

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
operator:
  namespace: acme-operators
  permissions:
    - apiGroups: ["*"]
      resources: ["*"]
      verbs: ["*"]
```

The schema of the object will be read from the file `values.json.schema` which is the standard way
for helm to validate values schema with [helm lint](https://helm.sh/docs/helm/helm_lint/) which will
be executed before `upgrade`.



## Wing Kubernetes Resources

You can also implement kblocks using [Winglang](https://winglang.io) classes.

The source directory includes `.w` files with a public class for each resource. It should also
include a `package.json` file the `@winglibs/k8s` dependency.

For example, [acme/workload/kblock.yaml] specifies a Wing-based resource called `Workload`:

```yaml
engine: wing/k8s
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

## Wing AWS/Terraform Resources

The `wing/tf-aws` engine can be used to implement your custom resource using Wing's `tf-aws` target.

```yaml
engine: wing/tf-aws
definition:
  group: acme.com
  version: v1
  kind: Queue
  plural: queues
operator:
  namespace: acme-operators
  envSecrets:
    AWS_ACCESS_KEY_ID: aws-credentials
    AWS_SECRET_ACCESS_KEY: aws-credentials
  env:
    AWS_DEFAULT_REGION: eu-west-2
    TF_BACKEND_BUCKET: eladb-tfstate
    TF_BACKEND_REGION: eu-west-2
    TF_BACKEND_KEY: acme-queue
    TF_BACKEND_DYNAMODB: eladb-tf-state
  permissions:
    - apiGroups: ["*"]
      resources: ["*"]
      verbs: ["*"]
```

The `Queue` class can be implemented using Wing's standard library (`cloud.*`) and compiled to
`tf-aws` for deployment.

## Terraform/OpenTofu Resources

See the [acme/topic](./acme/topic/) example.

## References and Outputs

You can add an `outputs` field under `definition` with a list of names of post-apply outputs produced by the kblock.

For example (from [acme/queue](./acme/queue/kblock.yaml)):

```yaml
engine: wing/tf-aws
definition:
  outputs:
    - queueUrl
```

Since this is a Terraform engine, the controller will expect a [Terraform
output](https://developer.hashicorp.com/terraform/language/values/outputs) by the name of `queueUrl`
and will populate the resource's `state` with this value once it's available.

An output can be referenced from another kblock through the syntax:

```
ref://queues.acme.com/my-queue/queueUrl
```

If the controller encounters this token when reconciling a resource, it will first wait for the
referenced resource to be ready and then it will read the value from it's state and replace it in
the manifest being reconciled.

## Build and Deployment

There's a simple CLI under `kblocks/bin/kblocks` which can be used to produce your kblocks helm package.

This script will call `kblocks build` and then install it via Helm:

```sh
./install.sh
```


## Roadmap

- [x] Report events such as compile/apply errors to parent resource
- [ ] Associate all child resources with the parent resource (`ownerReferences`?)
- [ ] Check schema upon helm apply
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
- [ ] Apply the `kblock/*` labels to all resources in the Helm engine (through a `--post-renderer`)
- [ ] Add `bundle-version` labels to resources (e.g. https://gateway-api.sigs.k8s.io/concepts/versioning/#version-indicators).

## Known Issues

- [ ] The "spec" struct must be called `XxxSpec` (we use this convention to find it).

