const { execSync } = require("child_process");

const exec = (operation) => {
  execSync('tsx index.ts', {
    stdio: 'inherit',
    env: {
      ...process.env,
      OPERATION: operation,
    },
  });
};

exports.create = async () => {
  return exec('create');
};

exports.update = async () => {
  return exec('update');
};

exports.delete = async () => {
  return exec('delete');
};

exports.read = async () => {
  return exec('read');
};
