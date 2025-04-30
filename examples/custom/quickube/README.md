# Quickube

> Instant Kubernetes clusters for prototypes, experimentation, development and testing.

[Quickube](https://quickube.sh) is an managed Kuberentes service which offers instant Kubernetes
clusters for development, experimentation and prototyping.

> Quickube is not publically available yet, please email us at quickube@wing.cloud to request early
> access.

## Installing the `qkube` CLI

> We will make this easier, do not fear.

1. Go to [releases](https://github.com/winglang/quickube/releases) and find the latest release.
2. Download the latest ".js" release
3. Install to `/usr/local/bin`:

    ```sh
    $ sudo mv ~/Download/qkube-v0.32.1.js /usr/local/bin/qkube
    $ sudo chmod +x /usr/local/bin/qkube
    $ qkube ls
    ```

Have fun!

## Choosing your cluster size

 Size    | vCPUs  | Memory
---------|--------|----------
`micro`  | 2 vCPU | 1 GiB
`small`  | 2 vCPU | 2 GiB
`medium` | 2 vCPU | 4 GiB
`large`  | 4 vCPU | 16 GiB
`xlarge` | 8 vCPU | 32 GiB

## Creating new quickube clusters

You can create a quickube cluster through the portal, via a Kubernetes manifest or via the CLI.

### Kblocks Portal

Click [here](https://kblocks.io/resources/new?type=acme.com/v1/quickubes) to create a new resource
through the Kblocks Portal.

### Kubernetes Manifest

```yaml
apiVersion: acme.com/v1
kind: Quickube
metadata:
  name: <your-cluster-name>
size: micro | small | medium | large | xlarge
```

### CLI

```console
$ qkube new
Created cluster "fimble-shimble" of size medium (5000mcpu, 128GiB).
Using cluster "fimble-shimble" as your default kubectl context.
```

Now you can play with it:

```console
$ kubectl get all
...
```

You can also request a different size:

```console
$ qkube new --size small
Creating new cluster "dinker-pinker" of size small (1000mcpu, 64GiB)...
Using cluster "dinker-pinker" as your default kubectl context.
```

You can request a cluster with a specific name:

```console
$ qkube new --name my-bangbang-cluster
```

### List all my clusters

```console
$ qkube ls
  fimble-shimble medium
* dinker-pinker  small
  bangly-pangly  small
```

### Switch clusters

```console
$ qkube use bangly-pangly
Cluster "bangly-pangly" is now your default kubectl context.
```

### Delete a cluster

```console
$ qkube rm bangly-pangly
Cluster "bangly-pangly" is gone forever.
```


## Roadmap

* IP allow list, in customer VPC
* Custom domain names (e.g. bangly-pangly.acme.com)
* Cluster templates (e.g. preloaded secrets, services, argo, etc)
* Self-hosted in customer account and managed by us
* Remote debugging with hot reloading
* Auto-create for pull requests (preview environments)
* RBAC

