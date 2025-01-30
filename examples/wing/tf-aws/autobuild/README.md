# AutoBuild

Adds CI/CD to GitHub repositories to build and publish Docker images, and optionally deploy them by
updating Kblock resources with the latest image tag.

## Options

### Required Fields

- **repository** (`string`): Specifies the GitHub repository in the format `org-name/repo-name` to build.

### Optional Fields

- **branch** (`string`): Defines the branch to build. Defaults to the repository's default branch if not specified.
- **rootDirectory** (`string`): Specifies the directory of the `Dockerfile`. Defaults to the root of the repository if not specified.
- **imageName** (`string`): The name of the Docker image to push to the registry. Defaults to the repository name.
- **deploy** (`DeploymentTarget`): Defines an optional deployment target:
  - **blockUri** (`string`): URI of the Kblocks resource to update (e.g., `acme.com/v1/workloads/portal-backend.quickube.sh/default/portal-backend`).
  - **field** (`string`): The field of the resource to update with the new image tag. Defaults to `image`.

## Examples in Kubernetes Manifests

```yaml
apiVersion: acme.com/v1
kind: AutoBuild
metadata:
  name: example-autobuild
repository: myorg/myrepo
rootDirectory: src
imageName: myapp
deploy:
  blockUri: acme.com/v1/workloads/my-cluster/default/myapp-kblocks
  field: image
```

```yaml
apiVersion: acme.com/v1
kind: AutoBuild
metadata:
  name: simple-autobuild
repository: "anotherorg/anotherrepo"
```

## Resources

This block creates a GitHub workflow under `.github/workflows/autobuild.yml` within the target repository.

## Behavior

When configured, the AutoBuild resource will generate a GitHub workflow to automatically build and
push Docker images upon every push to the specified branch. The Docker image will be tagged with the
commit SHA.

If configured, the image will be deployed to the specified block URI, by updating the `image` field
or any specified field within the resource.
