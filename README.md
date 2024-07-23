# Wing for Kubernetes

## Packaging classes as custom resources

## Usage

Install deps:

```sh
npm i
```

Start a `kind` cluster with a container image registry:

```sh
./reinstall-kind.sh
```

Install the operator:

```sh
./install.sh
```

## Roadmap

- [ ] Report events such as compile/apply errors to parent resource
- [ ] Associate all child resources with the parent resource
- [ ] Update status of parent object during deployment
- [ ] Apply annotations to all child-resources
- [x] Purge label
- [x] Helm chart output
- [x] Apply labels to all child-resources.
