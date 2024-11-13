# HelmResource
A kblock helm resource

## Usage

### Example: Basic HelmResource
Creates a simple HelmResource object.

```yaml
apiVersion: helm.kblocks.io/v1
kind: HelmResource
metadata:
  name: basic-helmresource

hello: "Hello"
```

## Configuration
- `hello` (string)
  - A greeting string that will be used to generate the `message` output. There is no default value, and it must be provided.
