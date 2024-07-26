# The Kwing of the Jungle

Kwing is a framework for creating custom Kubernetes resources that turn the Kubernetes jungle into a
park.

## Installation

Clone this repo:

```sh
git clone git@github.com/winglang/wing-operator.git
cd wing-operator
```

Install deps:

```sh
npm i
```

Create a `kind` cluster with a container image registry:

```sh
./scripts/reinstall-kind.sh
```

Install Crossplane (if you needed):

```sh
./scripts/install-crossplane.sh
```

## Usage

`resources.yaml` is an array of custom resource specifications.

For each resource spec:

- The `engine` field specifies how the resource is implemented.
- The `source` field points to a directory which contains the
  backend implementation of the resource.
- The `definition` field includes the CRD definition, without the schema.
- The `operator` field sets options for the generated Kubernetes operator.

For example:

```yaml

- engine: wing
  source: ./acme/workload
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

- engine: helm
  source: ./acme/cron
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

## Helm Resources

The `helm` engine tells the framework that the resource is implemented through a standard Helm chart,hart
where the `{{ Values }}` object is populated from the Kubernetes object specification.

The CRD schema is read from `<source>/schema.json` as a JSON schema.

## Wing Resource

The `wing` engine tells the framework that the custom resource is implemented via a Winglang class.

By convention, the class name is the same as the `<kind>` and the CRD schema is generated from the
`<kind>Spec` struct. For example, if the `kind` is `Foo`, then:

```js
pub struct FooSpec {
  // this is the spec
}

pub class Foo {
  new(spec: FooSpec) {

  }
}
```

## Deployment

This will package all resources and their operators into a local Helm chart and install into the
cluster:

```sh
./install.sh
```

## Roadmap

- [x] Report events such as compile/apply errors to parent resource
- [ ] Associate all child resources with the parent resource (`ownerReferences`?)
- [ ] Update status of parent object during deployment <-- this creates an update cycle
- [ ] Apply annotations to all child-resources
- [x] Purge label
- [x] Helm chart output
- [x] Apply labels to all child-resources.
- [x] Implement a resource using a Helm chart
- [ ] Implement a resource using a Terraform module
- [ ] Implement a resource using AWS CDK code
- [ ] Operator permissions
- [ ] "Delete" should just delete all the resources based on the objectid label instead of synthesizing a manifest
- [ ] Apply the `wing.cloud/*` labels to all resources in the Helm engine (through a `--post-renderer`)

## Known Issues

- [ ] The "spec" struct must be called `XxxSpec` (we use this convention to find it).

## Acme Example

- [ ] Backstage
- [ ] Backstage widgets for resources
- [x] Implement a resource using a Helm chart
- [ ] Crossplane/ACK resource
- [ ] Terraform and/or CDK resource