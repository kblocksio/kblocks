#!/usr/bin/env -S node
const { execSync } = require("node:child_process");
const { resolve, relative } = require("node:path");

const cliSource = relative(process.cwd(), resolve(__dirname, "../src/bump-pack.ts"));
execSync(`npx tsx ${cliSource} ${process.argv.slice(2).join(" ")}`, {
  stdio: "inherit",
});
