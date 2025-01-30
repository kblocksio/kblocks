# GithubWorkflow Block

This project is an example block implemented by a set of custom hooks. You can do anything with it!

## Manifest

The `kblock.yaml` file defines the block manifest. This is where you can find the block definitions
such as names, icons and description as well as optional operator environment settings.

## Inputs

The file `src/values.schema.json` is where the input JSON schema of the block is defined.

Within the script, the `KBLOCKS_OBJECT` environment variable points to a JSON file that contains the
object's full state (for `create` and `update`).

## Implementation

The engine calls an executable program under `src` based on the lifecycle event:

* `create` is called when an object was created.
* `update` is called when an object was updated.
* `delete` is called when an object is deleted.

## Outputs

The environment variable `KBLOCKS_OUTPUTS` is the path where a file should be written by the program
with a JSON object that contains the outputs listed in the `outputs` section fo the block.
