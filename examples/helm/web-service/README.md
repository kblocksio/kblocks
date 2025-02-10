# Web Services

## Host dynamic web apps (Express, Django, etc.) at a public URL.

Kblocks helps you host web apps written in your favorite language and framework: Node.js with Express, Python with Django—you name it. Kblocks builds and deploys your code with every push to your linked Git branch. You can also deploy a prebuilt Docker image.

Every Kblocks web service gets a unique `kblocks.io` subdomain, and you can add your own [custom domains](https://kblocks.io.docs/custom-domains). Web services can also communicate with your other Kblocks services over your [private network](https://kblocks.io/docs/private-network).

## Deploy a template

You can get started by deploying one of our basic app templates:

- [Express (Node.js)](https://kblocks.io/docs/templates/web-service/deploy-express)
- [Django (Python)](https://kblocks.io/docs/templates/web-service/deploy-django)
- [Ruby on Rails](https://kblocks.io/docs/templates/web-service/deploy-ruby-on-rails)
- [Gin (Go)](https://kblocks.io/docs/templates/web-service/deploy-gin)
- [Rocket (Rust)](https://kblocks.io/docs/templates/web-service/deploy-rocket)
- [Phoenix (Elixir)](https://kblocks.io/docs/templates/web-service/deploy-phoenix)
- [Laravel (PHP)](https://kblocks.io/docs/templates/web-service/deploy-laravel)

## Deploy your own code

You can build and deploy your web service using the code in your [GitHub](https://kblocks.io/docs/deploy-github) repo, or you can [pull a prebuilt Docker image from a container registry](https://kblocks.io/docs/deploy-docker).

1. In the Kblocks Dashboard, select your project and click New Resource...

2. Select Web Service from the New menu

3. Choose "From Repository".

4. Choose one of your GitHub repositories to deploy from. You’ll first need to link your GitHub account to Kblocks if you haven’t yet. You can use any public repo, or any private repo that your account has access to.

| Field | Description |
|-------|-------------|
| Name | A name to identify your service in the Kblocks Dashboard. Your service's kblocks.io subdomain also incorporates this name. |
| Region | The geographic region where your service will run. Your services in the same region can communicate over their shared private network. |
| Branch | The branch of your linked Git repo to use to build your service. Kblcoks can automatically redeploy your service whenever you push changes to this branch. |
| Runtime | The runtime environment for your service. Choose the runtime for your app's language. Kblocks provides native runtimes for these languages, along with a Docker runtime for building and running a custom image from a Dockerfile. |
| Build Command | The command for Kblocks to run to build your service from source. Common examples include npm install for Node.js and pip install -r requirements.txt for Python. |
| Start Command | The command for Kblocks to run to start your built service. Common examples include npm start for Node.js and gunicorn your_application.wsgi for Python. |

5. Still in the service creation form, choose an instance type to run your service on:

6. Under the Advanced section, you can set environment variables and secrets, add a persistent disk, set a health check path, and more.

7. Click "Create". Kblocks kicks off your service’s first build and deploy.
- You can view the deploy’s progress from your service’s Logs page in the Kblocks Dashboard.

## Deploy a prebuilt Docker image

1. In the Kblocks Dashboard, select your project and click New Resource...

2. Select Web Service from the New menu

3. Choose "From Image".

4. Enter the path to your image (e.g., docker.io/library/nginx:latest).

5. In the service creation form, provide the following details:

| Field | Description |
|-------|-------------|
| Name | A name to identify your service in the Kblocks Dashboard. Kblocks also uses this name when generating your service's kblocks.io subdomain. |
| Region | The geographic region where your service will run. Your services in the same region can communicate over their shared private network.
|

6. Still in the service creation form, choose an instance type to run your service on

7. Under the **Advanced** section, you can set environment variables and secrets, add a [persistent disk](https://kblocks.io/docs/persistent-disk), set a [health check path](https://kblocks.io/docs/health-checks), and more.

8. Click "Create". Kblocks pulls your specified Docker image and kicks off its initial deploy.
- You can view the deploy’s progress from your service’s Logs page in the Kblocks Dashboard.

## Port binding

Every Kblocks web service must bind to a port on host 0.0.0.0 to serve HTTP requests. Kblocks forwards inbound requests to your web service at this port (it is not directly reachable via the public internet).

We recommend binding your HTTP server to the port defined by the PORT environment variable. Here’s a basic Express example:

```js
const express = require('express')
const app = express()
const port = process.env.PORT || 4000;

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
```

The default value of PORT is 10000 for all Kblocks web services. You can override this value by [setting the environment variable](https://kblocks.io/docs/environment-variables) for your service in the [Kblocks Dashboard](https://kblocks.io/).

### Binding to multiple ports
Kblocks forwards inbound traffic to only one HTTP port per web service. However, your web service can bind to additional ports to receive traffic over your private network.

If your service does bind to multiple ports, always bind your public HTTP server to the value of the PORT environment variable.

## Connect to your web service

### Connecting from the public internet

Your web service is reachable via the public internet at its `kblocks.io` subdomain (along with any custom domains you add).

> **Note:** If you don't want your service to be reachable via the public internet, create a [private service](https://kblocks.io/docs/private-services) instead of a web service.

Kblocks's load balancer terminates SSL for inbound HTTPS requests, then forwards those requests to your web service over HTTP. If an inbound request uses HTTP, Kblocks first redirects it to HTTPS and then terminates SSL for it.

### Connecting from other Kblocks services
See [Private Network Communication](https://kblocks.io/docs/private-network).

## Additional features
Kblocks web services also provide:

- [Zero-downtime deploys](https://kblocks.io/docs/zero-downtime-deploys)
- Fully-managed [TLS certificates](https://kblocks.io/docs/tls-certificates)
- [Custom domains](https://kblocks.io/docs/custom-domains) (including wildcards)
- Manual or automatic [scaling](https://kblocks.io/docs/scaling)
- Optional [persistent disks](https://kblocks.io/docs/persistent-disk)
- [Service previews](https://kblocks.io/docs/service-previews)
- Instant [rollbacks](https://kblocks.io/docs/rollbacks)
- [Maintenance mode](https://kblocks.io/docs/maintenance-mode)
- [HTTP/2](https://kblocks.io/docs/http2)
- [DDoS protection](https://kblocks.io/docs/ddos-protection)
- [Brotli compression](https://kblocks.io/docs/brotli-compression)