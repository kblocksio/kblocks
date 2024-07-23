#!/bin/sh
namespace="crossplane-system"
secret="aws-secret"
secret_key="creds"
credentials_file="$HOME/.aws/credentials"

helm repo add crossplane-stable https://charts.crossplane.io/stable
helm repo update
helm upgrade --install crossplane crossplane-stable/crossplane --namespace $namespace --create-namespace

cat <<EOF | kubectl apply -f -
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws
spec:
  package: xpkg.upbound.io/crossplane-contrib/provider-aws:v0.48.1
EOF


if [ ! -f "$credentials_file" ];
then
  echo "AWS credentials file not found. Use 'aws configure' to create one."
  exit 1
fi

kubectl create secret generic $secret -n $namespace --from-file=$secret_key=$credentials_file

cat <<EOF | kubectl apply -f -
apiVersion: aws.crossplane.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: $namespace
      name: $secret
      key: $secret_key
EOF
