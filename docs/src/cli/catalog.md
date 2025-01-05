# catalog

Outputs a JSON catalog of available project templates. This is useful for generating a portal user
interface for selecting a project template.

```bash
kb catalog
``` 

Example output:

```json
{
  "helm": {
    "name": "Helm",
    "description": "Helm is an open-source package manager for ...",
    "icon": "...",
    "readme": "..."
  }
}
```