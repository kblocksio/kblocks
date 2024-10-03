#!/bin/bash
set -euo pipefail

../api/copy-api.sh
npx tsc

# render Chart.yaml and kblock.yaml for the kblocks.io/v1.Block resource
npx tsx scripts/render-my-manifest.ts

outdir="./dist"
rm -fr $outdir

# build the block
./bin/kblocks build --output $outdir --source ./
