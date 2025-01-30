#!/usr/bin/env node
const { commands } = require("@quickube/cli/cli.cjs");
const fs = require("fs");

const object = JSON.parse(fs.readFileSync(process.env.KBLOCKS_OBJECT, "utf8"));
const outputs = process.env.KBLOCKS_OUTPUTS;

const name = object.metadata.name;

const writeOutputs = (name) => {
  const hostname = `${name}.quickube.sh`;
  
  fs.writeFileSync(outputs, JSON.stringify({ 
    useCommand: `qkube use ${hostname}`,
    hostname
  }));
};

exports.create = async () => {
  const result = await commands.new({
    name,
    size: object.size,
    "skip-kubeconfig": true,
  });
  console.log(`Cluster ${result.name} created successfully`);
  writeOutputs(name);
};

exports.delete = async () => {
  await commands.rm({
    name: `${name}.quickube.sh`,
    "skip-kubeconfig": true,
  });
  console.log(`Cluster ${name} deleted successfully`);
  writeOutputs(name);
};

exports.update = async () => {
  console.log(`Cluster ${name} updated successfully`);
  writeOutputs(name);
};
