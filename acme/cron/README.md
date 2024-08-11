# Cron
A Kubernetes custom resource to define and manage CronJobs using Helm.

## Usage

### Example: MyCronJob
An example to create a CronJob that runs a custom script every day at midnight.

```yaml
apiVersion: acme.com/v1
kind: Cron
metadata:
  name: my-cronjob

image: alpine:latest
schedule: "0 0 * * *"
command: 
  - /bin/sh
  - -c
  - "echo Hello World"
```

### Example: MyBackupJob
An example to create a CronJob that performs a backup operation every Sunday at 2 AM.

```yaml
apiVersion: acme.com/v1
kind: Cron
metadata:
  name: my-backupjob

image: my-backup-image:latest
schedule: "0 2 * * 0"
command: 
  - /backup-script.sh
```

## Configuration

- **image** (string, required): The Docker image to use for the CronJob.
- **schedule** (string, required): The schedule in Cron format (e.g., "0 0 * * *" for every day at midnight).
- **command** (array of strings, optional): The command to run inside the container.

## Resources

- **ConfigMap**: Stores the configuration data for the CronJob.
  - Name: `<release-name>-configmap`
- **CronJob**: The Kubernetes CronJob resource.
  - Name: `<release-name>-cron`

## Behavior 

This resource is implemented through a Helm chart, which is a collection of templates and values that generate Kubernetes manifests. Once the resource is applied to the cluster, the Kblocks controller reconciles the state of the cluster with the desired state by converting the object into Helm `values`. The resources created are associated with the parent custom resource and tracked by it.