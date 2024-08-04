const k8s = require('@kubernetes/client-node');

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const client = k8s.KubernetesObjectApi.makeApiClient(kc);

// update deployment "my-deployment" in namespace "my-namespace" to 3 replicas
const deployment = {
  apiVersion: 'apps/v1',
  kind: 'Deployment',
  metadata: {
    name: 'my-deployment',
    namespace: 'my-namespace'
  },
  spec: {
    replicas: 3
  }
}

exports.client = client;
exports.apply = async function(doc) {
  let exists = false;
  try {
    await client.read(doc);
    exists = true;
  } catch {}

  try {
    if (exists) {
      await client.patch(doc);
    } else {
      await client.create(doc);
    }

    console.error(`applied ${doc.kind} ${doc.metadata.name}`);
  } catch (err) {
    console.error(`error applying ${doc.kind} ${doc.metadata}`);
    console.error(err.stack);
  }
};
