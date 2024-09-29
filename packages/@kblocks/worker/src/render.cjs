const yaml = require("yaml");

exports.renderYaml = function renderYaml(parent, all) {
  // adding "ownerReferences" to the generated manifest to ensure that the resources are deleted
  // when the owner is deleted.
  const parentNamespace = parent.metadata?.namespace ?? "default";
  const docs = yaml.parseAllDocuments(all);

  for (const doc of docs) {
    const metadata = doc.get("metadata");

    const namespace = metadata.get("namespace") ?? "default";
    if (parentNamespace === namespace) {
      const ownerRef = "ownerReferences";
      
      if (!metadata.has(ownerRef)) {
        metadata.set(ownerRef, new yaml.YAMLSeq());
      }

      const refs = metadata.get(ownerRef);

      refs.add({
        apiVersion: parent.apiVersion,
        kind: parent.kind,
        name: parent.metadata.name,
        uid: parent.metadata.uid,
        controller: true,
        blockOwnerDeletion: true,
      });
    }
  }

  return docs.map(doc => yaml.stringify(doc)).join("\n---\n");
}
