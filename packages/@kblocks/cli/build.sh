#!/bin/bash
set -euo pipefail

dir=$(cd $(dirname $0) && pwd)
cd $dir/../api
npx tsc

cd $dir
npx tsc

# render Chart.yaml and kblock.yaml for the kblocks.io/v1.Block resource
npx tsx scripts/render-my-manifest.ts

outdir="./dist"
rm -fr $outdir

# if we are not in CI, set the version to "dev"
if [ -z "${CI:-}" ]; then
  export KBLOCKS_VERSION="dev"
fi

# build the block
./bin/kblocks build --output $outdir --source ./
