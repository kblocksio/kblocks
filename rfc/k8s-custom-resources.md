# Creating custom Kubernetes resources with Wing



```sh
mkdir acme
cd acme
npm i @winglibs/k8s
```

Create `workload.w`:

```js
bring k8s;

pub struct WorkloadSpec {
  image: str;
  replicas: num?;
}

/// @k8s.group acme.com
/// @k8s.version v1
/// @k8s.singular workload
/// @k8s.plural workload
/// @k8s.listKind WorkloadList
/// @k8s.shortNames ["wl"]
pub class Workload extends k8s.Resource {
  new(opts: WorkloadSpec) {
    super();
    let d = new k8s.Deployment(replicas: opts.replicas);
    d.addContainer(image: opts.image);
  }
}
```

That's it. Now, let's create a Helm package so we can publish this
into a k8s cluster:

```sh
$ k8wing pack .
```

And install via helm:

```sh
helm install acme-platform .
```

> This is equivalent to running `k8wing install .`.

We can verify that the new custom resource is installed:

```sh
kubectl get crds
NAME                 CREATED AT
workloads.acme.com   2024-07-21T21:13:40Z
```

## Testing your new resource

Now that we've installed the custom resource into the cluster, let's add a resource:

```yaml
apiVersion: acme/v1
kind: Workload
metadata:
  name: my-workload
image: http-echo
replicas: 2
```
