# Project Setup

This section will guide you through the process of creating and setting up your block project. This
involves initializing a new project, navigating to the project directory, and understanding the
structure of the files created.

## Initialize a New Block Project Directory

To begin, you'll need to initialize a new block project. This can be done using the `kb`
command-line tool. The command below will create a new project with the specified parameters:

```bash
kb init tofu queue --group example.com --kind Queue --plural queues
```

- **`tofu`**: This is the type of project you are creating. In our example, we will use the [`tofu`](/docs/reference/supported-engines/tofu) engine to implement our block.
- **`queue`**: This is the directory name where your project files will be stored.
- **`--group example.com`**: This specifies the [API
  group](https://kubernetes.io/docs/concepts/overview/working-with-objects/kubernetes-api/#api-groups)
  for your Kubernetes custom resource.
- **`--kind Queue`**: This defines the Kubernetes CRD
  [kind](https://kubernetes.io/docs/concepts/overview/working-with-objects/kubernetes-api/#kinds-and-kinds).
  In this case, it's a "Queue".
- **`--plural queues`**: This specifies the plural form of your block kind, which is used in various
  configurations and API endpoints (see
  [pluralization](https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#plural-names)).

## Navigate to the Project Directory

Once the project is initialized, navigate to the newly created project directory:

```bash
cd queue
```

## Understanding the Project Structure

After initialization, your project directory will contain several files and subdirectories. These
are essential for the configuration and operation of your block. Here's a brief overview of what you
might find:

- `kblock.yaml`: The main configuration file that defines your block's metadata, specifications, and operator settings.

- `README.md`: Documentation file that describes your block, its purpose, and usage instructions.

- `src/` (the contents of this directory is engine-specific)
  - `values.schema.json`: JSON Schema file that defines the structure and validation rules for your block's API.
  - `main.tf`: The main Terraform configuration file where you'll define your infrastructure resources.
  - `variables.tf`: Defines input variables used in your Terraform configuration. Must match the schema.
  - `outputs.tf`: Specifies the output values that will be exposed by your block. The list of
    outputs match match the outputs defined in the `kblock.yaml` file.

Next, let's move on to [configuring your block](/docs/user-guide/04-block-configuration.mdx). This will involve setting
up the necessary configurations to tailor the block to your specific needs. 