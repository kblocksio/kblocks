# Cluster Setup

You can choose to install a local cluster or a setup an EC2 instance with a kind cluster. We have scripts for both!

## Local Cluster

This script can be used to install (or reinstall) a local `kind` cluster:

```sh
./scripts/reinstall-kind.sh
```

Optional: install Crossplane:

```sh
./scripts/install-crossplane.sh
```

## Remote Development Cluster

Let's setup your remote development cluster, shall we? There's a bit of manual work involved, but it's worth it!

First, go to the AWS Console and launch a new EC2 instance:

- Operating system: Amazon Linux
- CPU architecture: ARM (**this is important**)
- Instance type: `t4g.2xlarge`
- Create a keypair called `dev.pem` and store it in your home directory under `~/dev.pem`.
- Root volume size: 16GiB

Click "Launch Instance".

Then, hop over to the instance page and under the "Security" tab, click on the security group (it
would be called something like `launch-wizard-4`).

Click "Edit Inbound Rules" and add:

* HTTP (80)
* HTTPS (443)
* SSH (22)
* 5001 (image registry)
* 7443 (control plane)

Save.

Go to Docker Desktop Settings and under **Docker Engine** edit the configuration to include:

```json
{
  "insecure-registries": [
    "kind-registry:5001"
  ]
}
```

This allows Docker to connect to our remote registry without SSL.

Set DEV_SERVER_IP to the **public IP address** of your new host.

```sh
export DEV_SERVER_IP=<public ip>
```

Now we are ready to setup our server!

```sh
./script/setup-dev-server.sh
```
