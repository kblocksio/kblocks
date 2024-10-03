#!/bin/bash
set -euo pipefail

if [ ! -f "Chart.yaml" ]; then
  echo "Expected Chart.yaml to exist in the current directory "
  exit 1
fi

echo "$DOCKER_PASSWORD" | helm registry login registry-1.docker.io --username "$DOCKER_USERNAME" --password-stdin
helm package ./

# check we only have a single tarball
if [ $(ls -1 *.tgz | wc -l) -ne 1 ]; then
  echo "Expected exactly one tarball in the current directory"
  exit 1
fi

helm push *.tgz oci://registry-1.docker.io/$DOCKER_USERNAME
