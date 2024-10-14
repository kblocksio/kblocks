# <%= spec.definition.kind %> Block

This is a block backed by a [Wing for Kubernetes](https://winglang.io) program which uses
[CDK8s](https://cdk8s.io) to synthesize Kubernets manifests from Wing classes.

## Block Manifest

The `kblock.yaml` file defines the block manifest. This is where you can find the block definitions
such as names, icons and description as well as optional operator environment settings.

## Inputs

The input schema for your block is automatically dervied from the Wing struct by the name of
`<Kind>Spec`. For example, if your resource kind is `Bing`, then the CLI will look for a struct
named `BingSpec` and create a JSON schema from it.

## Implementation

Wing source code (`.w`) is expected under `src/`, and must include a public class named after the
"kind" of the resource.

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

The engine will run npm install from `src/`. You can install any Wing-compatible dependencies using
npm (the `@winglibs/k8s` dependency is required by the engine, so keep it).

## Outputs

The outputs specified in your `kblock.yaml` must have a corresponding pub fields in your class.

```js
pub class Bing {
  pub myOutput: str;

  new() {
    this.myOutput = "hello"
  }
}
```
