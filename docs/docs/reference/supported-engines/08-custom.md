# Custom

This block type allows custom implementations through lifecycle hooks. You can implement any functionality you need!

## Block Manifest

The `kblock.yaml` file defines the block manifest, containing block definitions like names, icons, description and optional operator environment settings.

## Input Schema

The input schema is defined in `src/values.schema.json`.

The `KBLOCKS_OBJECT` environment variable points to a JSON file containing the object's full state (for `create` and `update` operations).

## Implementation

The engine calls executable programs under `src/` based on lifecycle events:

* `create` - Called when an object is created
* `update` - Called when an object is updated
* `delete` - Called when an object is deleted

## Outputs

The `KBLOCKS_OUTPUTS` environment variable points to where the program should write a JSON object containing the outputs listed in the block's `outputs` section. 