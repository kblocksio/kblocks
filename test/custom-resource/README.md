# CustomResource
A kblock custom resource

## Usage

### Example: Basic CustomResource
Creates a simple CustomResource object.

```yaml
apiVersion: testing.kblocks.io/v1
kind: CustomResource
metadata:
  name: basic-customresource
hello: "Hello"
```

## Configuration
- `hello` (string)
  - A greeting string that will be used to generate the `message` output. There is no default value, and it must be provided.

## Outputs
- `message` (string)
  - A message created by the resource. This message is generated from the `hello` field.
