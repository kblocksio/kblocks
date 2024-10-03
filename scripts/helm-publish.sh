#!/bin/bash
set -euo pipefail

# if an argument is passed, use it as the path to the helm package
if [ -n "${1:-}" ]; then
  helm_package_path="$1"
else
  helm_package_path="."
fi

if [ ! -f "Chart.yaml" ]; then
  echo "Expected Chart.yaml to exist in the current directory "
  exit 1
fi

echo "Packaging helm chart in $helm_package_path"

echo "$DOCKER_PASSWORD" | helm registry login registry-1.docker.io --username "$DOCKER_USERNAME" --password-stdin
helm package "$helm_package_path"

# check we only have a single tarball
if [ $(ls -1 *.tgz | wc -l) -ne 1 ]; then
  echo "Expected exactly one tarball in the current directory"
  exit 1
fi

helm push *.tgz oci://registry-1.docker.io/$DOCKER_USERNAME
