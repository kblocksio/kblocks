#!/bin/sh
set -euo pipefail
dir=$(cd $(dirname $0) && pwd)
echo "building test kblocks..."

(
  cd ../packages/@kblocks/block
  npm run build
)

cd $dir

(
  cd test-resource
  "$dir/../packages/@kblocks/block/bin/kblocks" build -o dist -v "$dir/test-resource/kblock.yaml" -s "$dir/test-resource"
  cp dist/templates/* $dir/helm/templates/
)
