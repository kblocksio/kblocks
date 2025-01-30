# Private Services

## Host apps that only accept traffic from your other services in the same private network.

Kblocks private services are just like [web services](https://kblocks.io/docs/web-services), with one exception: **private services aren't reachable via the public internet**. *They do not receive a `kblocks.io` subdomain:*

```yaml
       Users (Internet)
            |
       +---------------+
       |  Web Service  |  <--- Publicly Exposed
       +---------------+
            |
   ------------------
       Private Network
            |
+-----------+----------+
|                      |
|    Private Service   |    Private Service
| (Not Exposed to Net) | (Not Exposed to Net)
+----------------------+
```

However, private services are reachable by your other services on the same private network! This means they’re perfect for services that only your own infrastructure needs to talk to.

Private services can listen on almost any port [(see details)](https://kblocks.io/docs/private-network) and communicate using any protocol.

## Examples
Here are some deployment guides for tools that make great private services:

- [RabbitMQ message broker](https://kblocks.io/docs/rabbitmq)
- [MongoDB database](https://kblocks.io/docs/mongodb)
- [Memcached cache](https://kblocks.io/docs/memcached)

## Private service or background worker?
Like private services, your [background workers](https://kblocks.io/docs/background-worker) are unreachable via the public internet. Unlike private services, background workers aren’t even reachable via their private network:

```yaml

                  Users (Internet)
                        |
                  +------------+
                  |  Web Service  |  <--- Publicly Exposed
                  +------------+
                        |
----------------------------------------------------
                Private Network
                        |
+--------------------+    +----------------------+
|                    |<---|  Background Service  |
|  Private Service   |    |  Can access Private  |
|  Accessible only   |    |  Services but aren't |
|  within network    |    |  accessible from     |
|                    |    |  private or public   |
|                    |    |  networks            |
+--------------------+    +----------------------+
```

- If your internal service will bind to at least one port and receive private network traffic, create a private service.
- Otherwise, create a background worker.

Background workers can send private network requests to other services but can’t receive them. They usually perform long-running or resource-intensive tasks, which they fetch from a job queue that’s often backed by a [Redis instance](https://kblocks.io/docs/redis).

## Connect to your private service
See [Private Network Communication](https://kblocks.io/docs/private-network).