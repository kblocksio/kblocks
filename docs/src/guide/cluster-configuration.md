# Cluster Configuration

In order to be able to install blocks to a cluster, we will need to create a [Kubernetes
secret](https://kubernetes.io/docs/concepts/configuration/secret/) named `kblocks` which contains
cluster-global configuration.

This secret is used by all the blocks installed in the cluster.

The secret must contain a `KBLOCKS_SYSTEM_ID` key which is used to identify the Kubernetes cluster.
This system identifier is used when the operator publishes events to the pubsub service.

```bash
kubectl create secret generic kblocks --from-literal=KBLOCKS_SYSTEM_ID=my-cluster
```

The following optional keys can also be specified:

- `KBLOCKS_API_KEY` - The API key for the Kblocks portal.
- `KBLOCKS_PUBSUB_HOST` and `KBLOCKS_PUBSUB_PORT` - The host and port for the Kblocks pubsub service.
- `KBLOCKS_ACCESS` - indicates if the operator is restricted to only read from the cluster or can
  also write to it (i.e. create/modify resources). Valid values are: `read_only` or `read_write`
  (default is `read_write`).