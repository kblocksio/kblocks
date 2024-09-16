# Quick8s User Story

### Install the CLI

```console
$ curl https://get.quick8s.sh | sh
q8s installed.
$ q8s --version
v0.34.0
```

### Login

```console
$ q8s login
<opens browser, GitHub/Google login/signup>
```

### Create a new cluster

```console
$ q8s new
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
$ q8s new --size small
Creating new cluster "dinker-pinker" of size small (1000mcpu, 64GiB)...
Using cluster "dinker-pinker" as your default kubectl context.
```

Other options:

```console
$ q8s new --region us-east-1 --provider aws
```

### List all my clusters

```console
$ q8s ls
  fimble-shimble medium
* dinker-pinker  small
  bangly-pangly  small
```

### Switch clusters

```console
$ q8s use bangly-pangly
Cluster "bangly-pangly" is now your default kubectl context.
```

### Delete a cluster

```console
$ q8s rm bangly-pangly
Cluster "bangly-pangly" is gone forever.
```

### Push an image to a cluster

```dockerfile
# Dockerfile
FROM hashicorp/http-echo
ENV ECHO_TEXT "Hello, quick8s!"
```

```console
$ docker build -t dinker-pinker.quick8s.sh/echo .
$ k8s registry password | docker login dinker-pinker.quick8s.sh -u admin --password-stdin
$ docker push dinker-pinker.quick8s.sh/echo
```

### Deploy a service with public access

```yaml
# manifest.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: echo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: echo
  template:
    metadata:
      labels:
        app: echo
    spec:
      containers:
        - name: echo
          image: dinker-pinker.quick8s.sh/echo:latest
          ports:
            - containerPort: 5678
---
apiVersion: v1
kind: Service
metadata:
  name: echo
spec:
  ports:
    - port: 5678
  selector:
    app: echo
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: echo
spec:
  rules:
    - https:
        paths:
          - backend:
              service:
                name: echo
                port:
                  number: 5678
            path: /echo
            pathType: Prefix
```

And apply:

```console
$ kubectl apply -f manifest.yaml
```

And now it can be accessed from the internets *via HTTPS* :-):

```console
$ curl https://dinker-pinker.quick8s.sh/echo
Hello, quick8s!
```

### Collaboration

Create an invite URL for a cluster:

```console
$ q8s invite bangly-pangly
https://quick8s.sh/join/bangly-pangly?key=xosdfkjsdf39dfjhsdf9l
```

Invitee clicks the link, logs in, and the cluster is added to their account.

Now, it's just there:

```sh
$ q8s use bangly-pangly
Using cluster "bangly-pangly" as your default kubectl context.
```

## API

### Create a new cluster

```
POST /clusters
```

Request body:

```json
{
  "size": "small" | "medium" | "large" | "xlarge",
  "region": "<provider-dependent>",
  "provider": "aws" | "azure" | "gcp"
}
```

Response:

```json
{
  "name": "bangly-pangly",
  "size": "small" | "medium" | "large" | "xlarge",
  "region": "<provider-dependent>",
  "provider": "aws" | "azure" | "gcp"
}
```

### Use cluster

```
GET /clusters/:name/creds
```

Response:

```json
{
  "publicIp": "1.2.3.4",
  "size": "medium",
  "region": "us-east-1",
  "provider": "aws",
  "kubeconfig": "<kubeconfig...>",
  "registryPassword": "x2923847usdcbjs8kjsdfsdf"
}
```

### List clusters

```
GET /clusters
```

Response:

```json
{
  "clusters": [
    {
      "name": "bangly-pangly",
      "size": "small" | "medium" | "large" | "xlarge",
      "region": "<provider-dependent>",
      "provider": "aws" | "azure" | "gcp"
    }
  ]
}
```

### Delete a cluster

```
DELETE /clusters/:name
```

### Create an invite link

```
POST /clusters/:name/invites
```

Response:

```json
{
  "invite": "https://quick8s.sh/join/bangly-pangly?key=xosdfkjsdf39dfjhsdf9l"
}
```


## Roadmap

* IP allow list, in customer VPC
* Custom domain names (e.g. bangly-pangly.acme.com)
* Cluster templates (e.g. preloaded secrets, services, argo, etc)
* Self-hosted in customer account and managed by us
* Remote debugging with hot reloading
* Auto-create for pull requests (preview environments)
* RBAC
