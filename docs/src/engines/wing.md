# Wing

This block type is backed by [Wing for Kubernetes](https://winglang.io) and uses [CDK8s](https://cdk8s.io) to synthesize Kubernetes manifests from Wing classes.

## Block Manifest

The `kblock.yaml` file defines the block manifest, containing block definitions like names, icons, description and optional operator environment settings.

## Input Schema

The input schema is automatically derived from the Wing struct named `<Kind>Spec`. For example, if your resource kind is `Bing`, the CLI looks for a struct named `BingSpec`.

The `KBLOCKS_SYSTEM_ID` environment variable contains the kblocks system name.

## Implementation

Wing source code (`.w` files) should be placed under `src/` and must include a public class named after the resource "kind":

```js
pub struct BingSpec {
  myInput: str;
}

pub class Bing {
  new(spec: BingSpec) {
    // implementation goes here...
  }
}
```

## Dependencies

The engine runs `npm install` from `src/`. You can install any Wing-compatible dependencies via npm. Note that `@winglibs/k8s` is required by the engine.

## Outputs

Outputs specified in `kblock.yaml` must have corresponding public fields in your class:

```js
pub class Bing {
  pub myOutput: str;

  new() {
    this.myOutput = "hello"
  }
}
``` 