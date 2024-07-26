#!/bin/sh
set -euo pipefail
./build.sh

# create the "acme-operators" namespace if it doesn't exist
kubectl create namespace acme-operators 2>/dev/null || true

helm upgrade \
  --install acme-platform ./dist
