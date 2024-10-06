# Kblocks

Kblocks is a tool for creating platform building blocks using any IAC engine or Helm charts and
packaging them as Kubernetes custom resources.

## Getting Started

Let's create a Helm-based block that creates a ConfigMap with a value provided by the user.

Create a directory for your new block:

```sh
mkdir helloer
cd helloer
```

And create a completely standard and innocent Helm Chart:

`Chart.yaml`:

```yaml
apiVersion: v2
name: my-hello-chart
version: 1.0.0
```

`templates/configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-config-map
data:
  greeting: {{ .Values.greeting }}
```

We can test this chart locally:

```sh
helm install helloer . --set greeting=howdy
```

As you can see, we set `greeting` to `howdy`, so this should be reflected in our ConfigMap.

```sh
$ kubectl describe configmaps helloer-config-map 
Data
====
key:
----
howdy
```

Let's clean up before moving to the next step:

```sh
helm uninstall helloer
```

OK, our Helm chart is ready to be packaged as a Kblock.

Next, we are going to create a *Block Manifest* to package this chart:

`kblock.yaml`:

```yaml
apiVersion: kblocks.io/v1
kind: Block
metadata:
  name: helloers.acme.com
spec:
  engine: helm
  definition:
    group: acme.com
    version: v1
    kind: Helloer
    plural: helloers
    schema:
      type: object
      required:
        - greeting
      properties:
        greeting:
          type: string
```

This should be pretty self-explainatory. But here's a quick rundown.

- We are using a `helm` engine. This means that kblocks will basically call `helm upgrade --install`
  in order to apply changes to `Helloer` resourcea.
- The type of the Kubernetes object is `acme.com/v1` (the `apiVersion`) and the `kind` is `Helloer`.
- The input schema takes a single string attribute called `greeting`. This will be passed to `helm` as values (`--set`).

We are ready to install our Kblock.

First, we'll need to grab the Kblocks CLI from npm:

```sh
npm i -g @kblocks/cli
```

We will now use `kblocks build` to package our block as a Helm chart:

```sh
kblocks build
...
Block built successfully: ./dist
```

And install this as a Helm chart in our cluster:

```sh
helm upgrade --install helloer-block ./dist
```

We can check that our cluster now has a new custom resource definition:

```sh
$ kubectl get customresourcedefinitions.apiextensions.k8s.io helloers.acme.com
NAME                CREATED AT
helloers.acme.com   2024-10-05T13:36:09Z
```

Yey! So now, we can create a new object:

`test.yaml`:

```yaml
apiVersion: acme.com/v1
kind: Helloer
metadata:
  name: helloer01
greeting: this is so cool
```

Apply:

```sh
kubectl apply -f ./test.yaml  
```

---

## GitOps

Let's install the kblocks controller under the `kblocks` namespace:

```sh
helm upgrade --install --create-namespace -n kblocks kblocks oci://registry-1.docker.io/wingcloudbot/kblocks
```


## Prerequisites

Install the following:

- node
- docker
- kind
- kubectl
- helm

## Installation

Clone this repo:

```sh
git clone git@github.com/winglang/kblocks.git
cd kblocks
```

Install deps:

```sh
npm i
```

## Setup

1. You'll nee a Kubernetes cluster, you can get one from [quickube](https://quickube.sh):

```sh
qkube new --size small
```

2. Slack Notifications

You will need to create a Slack channel called `#kblocks-dev-$USER` and invite `@MonadaCo Platform`
to it in order to receive notifications from your local cluster.

3. Build & Deploy to the Cluster

> We have a [skaffold](https://skaffold.dev/) setup.

```sh
npm run dev
```

4. Add test resources

Use `kubectl`:

```sh
kubectl apply -f test/examples/
```

5. Monitor logs

`npm run dev` will tail logs and you should be able to see how these resources are deployed.


## Resource documentation

- The `definition.readme` field points to a README file for this resource.
- The `definition.icon` field indicates the [heroicon](https://heroicons.com/) to use.

You can use `kblocks docs` to generate an initial README and suggest an icon for your kblock.

For each kblock, a `kblocks-xxx-metadata` ConfigMap will be deployed and will include the contents
of the README and the icon.

## Helm Resources

You can expose any [helm](https://helm.sh/) chart as a kblock. See [acme/cron](./acme/cron/) as an
example.

When a kblock is updated, the worker will call `helm upgrade` a populate the `{{ Values }}`
object from the Kubernetes object desired state.

For example, [acme/cron/kblock.yaml](./acme/cron/kblock.yaml) specifies a helm resource:

```yaml
engine: helm
definition:
  group: acme.com
  version: v1
  kind: Cron
  plural: crons
operator:
  namespace: acme-operators
  permissions:
    - apiGroups: ["*"]
      resources: ["*"]
      verbs: ["*"]
```

The schema of the object will be read from the file `values.json.schema` which is the standard way
for helm to validate values schema with [helm lint](https://helm.sh/docs/helm/helm_lint/) which will
be executed before `upgrade`.

## Wing Kubernetes Resources

You can also implement kblocks using [Winglang](https://winglang.io) classes.

The source directory includes `.w` files with a public class for each resource. It should also
include a `package.json` file the `@winglibs/k8s` dependency.

For example, [acme/workload/kblock.yaml] specifies a Wing-based resource called `Workload`:

```yaml
engine: wing/k8s
definition:
  group: acme.com
  version: v1
  kind: Workload
  plural: workloads
  singular: workload
  categories:
    - all
  listKind: WorkloadList
  shortNames:
    - "wl"
operator:
  namespace: acme-operators
  permissions:
    - apiGroups: ["*"]
      resources: ["*"]
      verbs: ["*"]
```

By convention, the class name is the same as the `<kind>` and the CRD schema is generated from the
`<kind>Spec` struct.

For example, if the `kind` is `Workload`, then:

```js
pub struct WorkloadSpec {
  // this is the spec
}

pub class Workload {
  new(spec: WorkloadSpec) {

  }
}
```

## Wing AWS/Terraform Resources

The `wing/tf-aws` engine can be used to implement your custom resource using Wing's `tf-aws` target.

```yaml
engine: wing/tf-aws
definition:
  group: acme.com
  version: v1
  kind: Queue
  plural: queues
operator:
  namespace: acme-operators
  envSecrets:
    AWS_ACCESS_KEY_ID: aws-credentials
    AWS_SECRET_ACCESS_KEY: aws-credentials
  env:
    AWS_DEFAULT_REGION: eu-west-2
    TF_BACKEND_BUCKET: eladb-tfstate
    TF_BACKEND_REGION: eu-west-2
    TF_BACKEND_KEY: acme-queue
    TF_BACKEND_DYNAMODB: eladb-tf-state
  permissions:
    - apiGroups: ["*"]
      resources: ["*"]
      verbs: ["*"]
```

The `Queue` class can be implemented using Wing's standard library (`cloud.*`) and compiled to
`tf-aws` for deployment.

## Terraform/OpenTofu Resources

See the [acme/topic](./acme/topic/) example.

## References and Outputs

You can add an `outputs` field under `definition` with a list of names of post-apply outputs produced by the kblock.

For example (from [acme/queue](./acme/queue/kblock.yaml)):

```yaml
engine: wing/tf-aws
definition:
  outputs:
    - queueUrl
```

Since this is a Terraform engine, the worker will expect a [Terraform
output](https://developer.hashicorp.com/terraform/language/values/outputs) by the name of `queueUrl`
and will populate the resource's `state` with this value once it's available.

An output can be referenced from another kblock through the syntax:

```
ref://queues.acme.com/my-queue/queueUrl
```

If the worker encounters this token when reconciling a resource, it will first wait for the
referenced resource to be ready and then it will read the value from it's state and replace it in
the manifest being reconciled.

## Event Reporting

If you specify a WebSocket address in `EVENTS_WS_URL`, workers will send there everything that's going on.

Check out the protocol under: [`events.ts`](./packages/@kblocks/worker/src/events.ts).

## Roadmap

- [x] Report events such as compile/apply errors to parent resource
- [ ] Associate all child resources with the parent resource (`ownerReferences`?)
- [ ] Check schema upon helm apply
- [ ] Update status of parent object during deployment <-- this creates an update cycle
- [ ] Apply `annotations` to all child-resources
- [x] Purge label
- [x] Helm chart output
- [x] Apply labels to all child-resources.
- [x] Implement a resource using a Helm chart
- [ ] Implement a resource using a Terraform module
- [ ] Implement a resource using AWS CDK code
- [ ] Operator permissions
- [x] "Delete" should just delete all the resources based on the objectid label instead of synthesizing a manifest
- [ ] Apply the `kblock/*` labels to all resources in the Helm engine (through a `--post-renderer`)
- [ ] Add `bundle-version` labels to resources (e.g. https://gateway-api.sigs.k8s.io/concepts/versioning/#version-indicators).

## Known Issues

- [ ] The "spec" struct must be called `XxxSpec` (we use this convention to find it).

## License

This software is proprietary and confidential. Unauthorized copying, distribution, or use of this software, via any medium, is strictly prohibited.

All rights reserved. No part of this software may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of the copyright holder, except in the case of brief quotations embodied in critical reviews and certain other noncommercial uses permitted by copyright law.

For permission requests, please contact the copyright holder.

© 2024 Wing Cloud, Inc. All rights reserved.