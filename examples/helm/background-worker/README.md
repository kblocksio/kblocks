# Background Workers


## Offload tasks to a separate process listening on a queue.

Background workers are useful for processes that need to run continuously (unlike [cron jobs](https://kblocks.io/docs/cron-jobs)) but that don’t expose a port like web services or [private services](https://kblocks.io/docs/private-services).

They are most often used to run event loops that listen on a queue backed by a datastore such as [Redis](https://kblocks.io/docs/redis) and process events as they come in. This helps make your public-facing services more responsive by offloading long-running tasks to separate processes.

## Example

A background worker can be implemented using a [Kblocks Workload](https://kblocks.io/docs/workloads) that runs a container with a long-running command that listens on a queue.


