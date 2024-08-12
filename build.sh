#!/bin/sh
set -euo pipefail
dir=$(cd $(dirname $0); pwd)

# npm i

kblocks="$dir/packages/@kblocks/cli/bin/kblocks"

(cd packages/@kblocks/cli && tsc)

rm -fr dist

for block in $(cat $dir/kblocks.list | grep -v "^#"); do
  if [ ! -d $block ]; then
    continue;
  fi

  $kblocks build --output dist/templates $block
done

if [ ! -f Chart.yaml ]; then
  echo "Chart.yaml not found"
  exit 1
fi

cp Chart.yaml dist/


echo "Helm chart created under: ./dist"