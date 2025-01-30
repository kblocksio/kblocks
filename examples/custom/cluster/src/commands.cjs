const fs = require("fs");

const COMMAND_TEMPLATE = `
\`\`\`sh
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Namespace
metadata:
  name: kblocks
---
apiVersion: v1
kind: Secret
metadata:
  namespace: kblocks
  name: kblocks
stringData:
  KBLOCKS_PUBSUB_HOST: __KBLOCKS_PUBSUB_HOST__
  KBLOCKS_PUBSUB_PORT: "__KBLOCKS_PUBSUB_PORT__"
  KBLOCKS_PUBSUB_KEY: __KBLOCKS_PUBSUB_KEY__
  KBLOCKS_SYSTEM_ID: __KBLOCKS_SYSTEM_ID__
  KBLOCKS_STORAGE_PREFIX: __KBLOCKS_STORAGE_PREFIX__
  KBLOCKS_PORTAL_SYSTEM: __KBLOCKS_PORTAL_SYSTEM__
EOF
\`\`\`
`;

function fillTemplate(template, variables) {
  return template.replace(/__(.*?)__/g, (_, key) => {
    return variables[key] || "";
  });
}

const object = JSON.parse(fs.readFileSync(process.env.KBLOCKS_OBJECT, "utf8"));
const outputs = process.env.KBLOCKS_OUTPUTS;
const adminPassword = process.env.KBLOCKS_PUBSUB_KEY;
const redisHost = process.env.KBLOCKS_PUBSUB_HOST;
const redisPort = process.env.KBLOCKS_PUBSUB_PORT;
const portalSystem = process.env.KBLOCKS_SYSTEM_ID;

const clusterId = object.metadata.name;

const writeOutputs = (command) => {
  fs.writeFileSync(
    outputs,
    JSON.stringify({
      command,
    }),
  );
};

exports.create = async () => {
  // todo create a new user in redis per cluster
  const command = fillTemplate(COMMAND_TEMPLATE, {
    KBLOCKS_PUBSUB_KEY: adminPassword,
    KBLOCKS_PUBSUB_HOST: redisHost,
    KBLOCKS_PUBSUB_PORT: redisPort,
    KBLOCKS_SYSTEM_ID: clusterId,
    KBLOCKS_STORAGE_PREFIX: clusterId,
    KBLOCKS_PORTAL_SYSTEM: portalSystem,
  });
  console.log(`Creating a new cluster ${clusterId}`);
  console.log("generating a 'create cluster' command", command);
  writeOutputs(command);
};

exports.deleteUser = async () => {
  console.log(`Cluster ${clusterId} was deleted successfully`);
};

exports.update = async () => {
  console.log(`Cluster ${clusterId} was updated successfully`);
};
