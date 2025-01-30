# AutoBuild

Adds CI/CD to GitHub repositories to build a static website and push it to an S3 bucket.

## Options

### Required Fields

- **repository** (`string`): Specifies the GitHub repository in the format `org-name/repo-name` to build.

### Optional Fields

- **branch** (`string`): Defines the branch to build. Defaults to the repository's default branch if not specified.
- **rootDirectory** (`string`): Specifies the directory from which to build the static website.
- **buildCommand** (`string`): Specifies the command to build the static website.
- **outputDirectory** (`string`): Specifies the directory to output the static website to.
- **bucket** (`string`): The name of the S3 bucket to deploy the static website to.

## Examples in Kubernetes Manifests

```yaml
apiVersion: acme.com/v1
kind: AutoBuild
metadata:
  name: example-autobuild-static-site
repository: myorg/myrepo
rootDirectory: src
bucket: https://my-bucket.s3.us-east-1.amazonaws.com
```

```yaml
apiVersion: acme.com/v1
kind: AutoBuild
metadata:
  name: simple-autobuild-static-site
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
