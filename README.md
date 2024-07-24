# The Kwing of the Jungle

Kwing is a framework for creating custom Kubernetes resources that turn the Kubernetes jungle into a
park.

## Usage

Install deps:

```sh
npm i
```

Start a `kind` cluster with a container image registry:

```sh
./scripts/reinstall-kind.sh
```

Install Crossplane:

```sh
./scripts/install-crossplane.sh
```

Edit `acme/*` and after you've done, install the operator:

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

## Known Issues

- [ ] The "spec" struct must be called `XxxSpec` (we use this convention to find it).

## Acme Example

- [ ] Backstage
- [ ] Backstage widgets for resources
- [x] Implement a resource using a Helm chart
- [ ] Crossplane/ACK resource
- [ ] Terraform and/or CDK resource