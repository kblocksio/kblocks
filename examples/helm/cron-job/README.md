# Cron Jobs

## Run periodic tasks on a schedule you define.

You can create [cron jobs](https://en.wikipedia.org/wiki/Cron) that run periodically based on a schedule you define. You create cron jobs from the [Kblocks Dashboard](https://kblocks.io), similar to other services.

Your cron job can use any of your GitHub, GitLab, or Bitbucket repos, or it can pull a prebuilt Docker image from an external registry.

- **Git Repo**: A new version of the code is built whenever you push changes to your connected branch.
- **Docker Image**: Kblocks pulls the image before each run of your cron job. The image is not retained between runs.

## Setup

Cron job setup is similar to other services, but with these specific fields:

### Schedule
Define the schedule using a [cron expression](https://en.wikipedia.org/wiki/Cron).

Example schedules:

```bash
Every 10 minutes: */10 * * * *
Daily at noon UTC: 0 12 * * *
Every 60 minutes, Monday through Friday: */60 * * * MON-FRI
```

All schedules use UTC.

### Command
The command to execute, which can be:
- A valid Linux command like `echo "Hello!"` 
- An executable bash script

### Environment Variables

Cron jobs can use environment variables like any other service, and you can also use [config maps](https://kblocks.io/docs/config-maps) to share variables across services.

## Manually Triggering a Run

To manually trigger a run, go to the cron job page in the Kblocks Dashboard and click **Trigger Run**. If a run is already active, the active run will be canceled before the new run starts.

## Single-Run Guarantee

Kblocks guarantees that at most one instance of a cron job will run at a time. If you trigger a run manually while one is active, the current run will be canceled.

- **Ongoing run during the next scheduled run**: The next run will be delayed until the current one finishes.
- **Run longer than 12 hours**: Kblocks stops the run after 12 hours. For longer tasks, use a [background worker](https://kblocks.io/docs/background-workers).

## Instance Types

Cron jobs can use any standard [instance type](https://kblocks.io/docs/instance-types) based on their CPU and memory requirements. 

Cron jobs cannot provision or access a [persistent disk](https://kblocks.io/docs/persistent-disks).
