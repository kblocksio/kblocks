import fs from "fs";
import yaml from "yaml";
import path from "path";
import type { ApiObject } from "@kblocks/api";
// @ts-ignore
import { renderYaml } from "./render.cjs";
// function renderYaml(parent: ApiObject, all: string) {
//   // adding "ownerReferences" to the generated manifest to ensure that the resources are deleted
//   // when the owner is deleted.
//   const parentNamespace = parent.metadata?.namespace ?? "default";
//   const docs = yaml.parseAllDocuments(all);

//   for (const doc of docs) {
//     const metadata = doc.get("metadata") as yaml.YAMLMap;

//     const namespace = metadata.get("namespace") ?? "default";
//     if (parentNamespace === namespace) {
//       const ownerRef = "ownerReferences";
      
//       if (!metadata.has(ownerRef)) {
//         metadata.set(ownerRef, new yaml.YAMLSeq());
//       }

//       const refs = metadata.get(ownerRef) as yaml.YAMLSeq

//       refs.add({
//         apiVersion: parent.apiVersion,
//         kind: parent.kind,
//         name: parent.metadata.name,
//         uid: parent.metadata.uid,
//         controller: true,
//         blockOwnerDeletion: true,
//       });
//     }
//   }

//   return docs.map(doc => yaml.stringify(doc)).join("\n---\n");
// }

export function addOwnerReferences(parent: ApiObject, targetdir: string, outfile: string): string {
  let yamlFile;
  for (const file of fs.readdirSync(targetdir)) {
    if (file.endsWith(".yaml")) {
      yamlFile = file;
      break;
    }
  }

  if (!yamlFile) {
    throw new Error(`no YAML file found in ${targetdir}`);
  }

  const input = fs.readFileSync(path.join(targetdir, yamlFile), "utf-8");
  const output = renderYaml(parent, input);
  fs.writeFileSync(outfile, output);
  return outfile;
}

// exports.addOwnerReferences = addOwnerReferences;
// exports.renderYaml = renderYaml;

// const parent = {
//   apiVersion: "acme.com/v1",
//   kind: "Workload",
//   metadata: {
//     name: "workload.test.k8s",
//     uid: "1234",
//   },
// };

// const out = addOwnerReferences(parent, "/Users/eladb/code/kblocks/acme/service/target/main.k8s", "my-output.yaml");
// console.log(out);