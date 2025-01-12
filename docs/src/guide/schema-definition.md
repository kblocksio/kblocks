# Block API Schema

Let's define the schema for our custom resource and set up the required variables.

1. Define the custom resource schema in `src/values.schema.json`:

```json
{
  "type": "object",
  "required": [ "queueName" ],
  "properties": {
    "queueName": {
      "type": "string",
      "description": "The name of the queue"
    },
    "timeout": {
      "type": "number",
      "description": "Queue timeout in seconds"
    }
  }
}
```

2. Add the corresponding variables to the `src/variables.tf` file:

```hcl
variable "queueName" {
  type        = string
  description = "The name of the queue"
  required    = true
}

variable "timeout" {
  type        = number
  description = "Queue timeout in seconds"
  default     = null
}
```

Now that we have our schema defined, let's move on to [writing the infrastructure code](./infrastructure.md). 
