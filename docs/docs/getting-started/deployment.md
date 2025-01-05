---
sidebar_position: 8
---

# Deployment

Finally, let's build and deploy our block to the cluster.

1. Build the block:

```bash
kb build
```

This command creates a `dist/` directory with a Helm chart that is ready to deploy to a cluster.

2. Create a secret with the AWS credentials (replace with your own):

```bash
kubectl create secret generic aws-credentials \
  --from-literal=AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
  --from-literal=AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
  --from-literal=AWS_DEFAULT_REGION=us-east-1
```

3. Install the block to your cluster using `helm`:

```bash
helm upgrade --install queue-block ./dist
```

4. Wait for the pods to be ready:

```bash
kubectl get pods
```

You should see something like this:

```
NAME                                                   READY   STATUS    RESTARTS   AGE
kblocks-queue-control-7b8c7fc5b5-n4bcr                 1/1     Running   0          4m9s
kblocks-queue-operator-58fd74668b-4vnxj                2/2     Running   0          4m9s
kblocks-queue-worker-0                                 1/1     Running   0          4m9s
```

Congratulations! You've successfully created and deployed your first block! 