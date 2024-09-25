#!/bin/sh
set -euo pipefail
dir=$(cd $(dirname $0) && pwd)
echo "building test kblocks..."

(
  cd ../packages/@kblocks/cli
  npm run build
)

cd $dir

(
  cd wing-k8s
  ../../packages/@kblocks/cli/bin/kblocks build
  cp dist/templates/* $dir/helm/templates/
)
