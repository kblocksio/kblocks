#!/bin/sh
set -euo pipefail
rm -fr target

wing compile -t @winglibs/k8s main.w

if [ ! -f Chart.yaml ]; then
  echo "Chart.yaml not found"
  exit 1
fi

target="target/main.k8s"
templates="$target/templates"

mkdir -p $templates
mv target/main.k8s/*.yaml $templates/
cp Chart.yaml $target/

echo "Helm chart created under: $target"