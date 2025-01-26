# Using your Block

Now that your block is installed, we are ready to provision new resources. Since blocks are
represented as custom resources in Kubernetes, you can use the `kubectl` or any
Kubernetes-compatible tool to create/update/delete resources.

## Exploring our new CRD

Before we start creating resources, let's take a look at the new CRD that we created.

```bash
kubectl describe crd queues.example.com
```

This will output a description of our new custom resource. You should be able to recognize the
group, version and naming we specified in the `kblock.yaml` file.

You should also be able to see the Open API v3 schema we defined in the `values.schema.json` file.

## Creating a new resource

Let'us use `kubectl` to create a queue resource:

```bash
kubectl apply -f - <<EOF
apiVersion: example.com/v1
kind: Queue
metadata:
  name: my-first-queue
spec:
  queueName: my-queue
  timeout: 300
EOF
```

You should get:

```
queue.example.com/my-first-queue created
```

## Monitoring block activity

Kubernetes is asynchronous by nature, so you can't expect to see the resource immediately
available. You can use the `kubectl get` command to see the status of your resource:

```bash
kubectl get queues.example.com
```

You can see the `STATUS` field to see the status of the resource.

```
NAME             READY   STATUS       QUEUEURL
my-first-queue   False   InProgress   
```

To see more details about the resource, you can use the `kubectl describe` command:

```bash
kubectl describe queues.example.com my-first-queue
```

Under the "Events" section, you can see the status of the resource.

```
Type    Reason   Age   From              Message
----    ------   ----  ----              -------
Normal  Started  80s   kblocks/operator  Updating resource
```

Errors will also be reported in the events section.

Once the resource has successfully been created, you should see something like this:

```
NAME             READY   STATUS      QUEUEURL
my-first-queue   True    Completed   https://sqs.us-east-1.amazonaws.com/111111111111/my-queue
```

That's it, your block is now ready to use!

## Detailed operator logs

To see detailed logs from the block operator. Specifically, the "worker" pod is where your engine provisions the resources.

You can use the `kubectl logs` command as follows:

```bash
kubectl logs -f kblocks-queue-worker-0
```