#!/bin/bash
set -euo pipefail
dirname=$(cd $(dirname $0); pwd)

# clean up any previous copy
# turn api directory to read-write if it exists
if [ -d "./src/api" ]; then
  chmod -R a+w ./src/api
  rm -rf ./src/api
fi

mkdir -p ./src/api
cp -rL $dirname/src/* ./src/api/

# make TypeScript files read-only to avoid accidental changes
find ./src/api -name "*.ts" -type f -exec chmod a-w {} \;


