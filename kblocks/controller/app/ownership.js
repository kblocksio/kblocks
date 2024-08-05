const fs = require("fs");
const yaml = require("yaml");
const path = require("path");

function addOwnerReferences(parent, targetdir, outfile) {
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
  
  // adding "ownerReferences" to the generated manifest to ensure that the resources are deleted
  // when the owner is deleted.
  const docs = yaml.parseAllDocuments(fs.readFileSync(path.join(targetdir, yamlFile), "utf-8"));
  const objects = [];
  for (const doc of docs) {
    const obj = doc.contents?.toJSON();
    if (obj) {
      // owner references are only added if the object and the parent object are in the same namespace
      if ((obj.metadata.namespace ?? "default") === (parent.metadata.namespace ?? "default")) {
        obj.metadata.ownerReferences = obj.metadata.ownerReferences ?? [];
        obj.metadata.ownerReferences.push({
          apiVersion: parent.apiVersion,
          kind: parent.kind,
          name: parent.metadata.name,
          uid: parent.metadata.uid,
          controller: true,
          blockOwnerDeletion: true,
        });
      }

      objects.push(obj);
    }
  }

  fs.writeFileSync(outfile, objects.map(o => yaml.stringify(o)).join("\n---\n"));
  return outfile;
}

exports.addOwnerReferences = addOwnerReferences;

// const parent = {
//   apiVersion: "acme.com/v1",
//   kind: "Workload",
//   metadata: {
//     name: "workload.test.k8s",
//     uid: "1234",
//   },
// };

// const out = addOwnerReference(parent, "acme/workload/target/workload.test.k8s", "my-output.yaml");
// console.log(out);