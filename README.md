# Wing for Kubernetes

## Packaging classes as custom resources

Create `main.w`:

```js
bring k8s;


```

## Usage

Packages the operator into a Helm chart:

```sh
./helm-build.sh
```

## Roadmap

- [ ] Apply annotations and labels to all child-resources.
- [ ] Purge label
- [x] Helm chart output
