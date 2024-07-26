#!/bin/sh
set -euo pipefail

target_root="wing-operator/target"

rm -fr $target_root

wing compile -t @winglibs/k8s wing-operator/main.w

if [ ! -f Chart.yaml ]; then
  echo "Chart.yaml not found"
  exit 1
fi

target="$target_root/main.k8s"
templates="$target/templates"

mkdir -p $templates
mv $target/*.yaml $templates/
cp Chart.yaml $target/

output="./dist"

rm -fr $output
mv $target $output
rm -fr $output/.wing
rm -fr $target_root

echo "Helm chart created under: $output"