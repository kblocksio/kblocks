# ApiDoc
Generates API documentation from a GitHub repository.

## Options

### Required Fields
- **repository** (string): The URL of the GitHub repository containing the source code for which the API documentation is to be generated.
- **directory** (string): The directory in the repository to use for the API documentation (e.g. `backend`).

## Examples in Kubernetes Manifests

```yaml
apiVersion: acme.com/v1
kind: ApiDoc
metadata:
  name: example-apidoc
repository: "user/repo"
directory: "backend"
```

## Resources
No explicit child resources created.

## Behavior
The `ApiDoc` custom resource processes a specified GitHub repository to generate Swagger/OpenAPI documentation.