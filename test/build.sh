#!/bin/sh
set -eu pipefail
dir=$(cd $(dirname $0) && pwd)
echo "building test kblocks..."

(
  cd ../packages/@kblocks/cli
  npm run build
)

(
  cd $dir/test-resource
  "$dir/../packages/@kblocks/cli/bin/kblocks" build -o dist
  cp dist/templates/* $dir/helm/templates/
)

(
  cd $dir/custom-resource
  "$dir/../packages/@kblocks/cli/bin/kblocks" build -o dist
  cp dist/templates/* $dir/helm/templates/
)

(
  cd $dir/helm-resource
  "$dir/../packages/@kblocks/cli/bin/kblocks" build -o dist
  cp dist/templates/* $dir/helm/templates/
)
