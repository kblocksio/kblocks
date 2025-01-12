# Deployment

Finally, let's build and deploy our block to the cluster.

Under the `queue` directory, follow these steps:

1. Build the block:

    ```bash
    kb build
    ```

    This command creates a `dist/` directory with a Helm chart that is ready to deploy to a cluster:

    ```shell
    $ ls dist
    Chart.yaml templates
    ```

3. In order for the Terraform AWS provider to be able to access your AWS account, we need to store our AWS credentials in the `aws-cerdentials` secret:

    ```bash
    kubectl create secret generic aws-credentials \
      --from-literal=AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
      --from-literal=AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
      --from-literal=AWS_DEFAULT_REGION=us-east-1
    ```

4. Install the block to your cluster using `helm`:

    ```bash
    helm upgrade --install queue-block ./dist
    ```

5. Wait for the pods to be ready:

    ```bash
    kubectl get pods
    ```

    When all pods are ready, you should see something like this (initial installation will likely take some time because images are pulled fresh from the docker registry):
    
    ```
    NAME                                                   READY   STATUS    RESTARTS   AGE
    kblocks-queue-control-7b8c7fc5b5-n4bcr                 1/1     Running   0          4m9s
    kblocks-queue-operator-58fd74668b-4vnxj                2/2     Running   0          4m9s
    kblocks-queue-worker-0                                 1/1     Running   0          4m9s
    ```

Congratulations! You've successfully created and deployed your first block! 
