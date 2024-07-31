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

if [ -n "${GITHUB_TOKEN:-}" ]; then
  github_secret_name="github-token"
  kubectl delete secret $github_secret_name -n $namespace 2>/dev/null || true
  kubectl create secret generic $github_secret_name -n $namespace --from-literal=GITHUB_TOKEN=$GITHUB_TOKEN
fi

# tf backend env var looks like this: "AWS_DEFAULT_REGION=us-east-1\nTF_BACKEND_BUCKET=eladcon-tfstate\n..."
if [ -n "${TF_BACKEND_CONFIG:-}" ]; then
  # write the env var to a temp fle
  TEMP_TF_CONFIG=$(mktemp)
  echo "$TF_BACKEND_CONFIG" > "$TEMP_TF_CONFIG"

  tf_backend_cm="tf-backend-config"
  kubectl delete configmap $tf_backend_cm -n $namespace 2>/dev/null || true
  kubectl create configmap $tf_backend_cm -n $namespace --from-env-file=$TEMP_TF_CONFIG
fi

helm upgrade --install acme-platform ./dist
