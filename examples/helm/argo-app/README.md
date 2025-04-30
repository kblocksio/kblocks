# ArgoCD Application

This block represents an ArgoCD application which track a GitHub repository for changes and deploys any commits to the cluster.

## Usage

Say you have a GitHub repository that includes a Helm-based configuration for your application.

For a basic example, see the [hello-gitops](https://github.com/superacme/hello-gitops) repository.

We want ArgoCD to monitor this repository and deploy every commit into `main` to our cluster.

When creating an `ArgoApp` resource, you'll need to specify the following options:

 * `repository` - The GitHub repository with the application to deploy (e.g. `myorg/myapp`).
 * `path` - The directory containing the Helm chart to deploy (defaults to the root of the repository).
 * `branch` - The branch to deploy from.
 * `parameters` - Helm has the ability to set parameter values, which override any values in a `values.yaml`. The key is the path to the parameter (e.g. `image.tag`). The value is the value to set.
 