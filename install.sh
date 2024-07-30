#!/bin/sh
set -euo pipefail

kblocks/bin/kblocks build

namespace="acme-operators"

# create the "acme-operators" namespace if it doesn't exist
kubectl create namespace $namespace 2>/dev/null || true


secret_name="aws-credentials"

if [ -n "${AWS_ACCESS_KEY_ID:-}" ] && [ -n "${AWS_SECRET_ACCESS_KEY:-}" ]; then
  kubectl delete secret $secret_name -n $namespace 2>/dev/null || true
  kubectl create secret generic $secret_name -n $namespace --from-literal=AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID --from-literal=AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
fi

helm upgrade --install acme-platform ./dist
