#!/bin/sh
set -euo pipefail
cd "$(dirname "$0")"

echo "Adding entries 'kind-control-plane' and 'kind-registry' to /etc/hosts..."
cat /etc/hosts | grep -v "kind-" > /tmp/hosts
echo "127.0.0.1 kind-registry" >> /tmp/hosts
echo "127.0.0.1 kind-control-plane" >> /tmp/hosts
echo "Please enter your password if prompted"
sudo cp /etc/hosts /etc/hosts.bak
sudo cp /tmp/hosts /etc/hosts

echo "Setting up kubectl to connect to your local kind cluster..."
kind get kubeconfig > ~/.kube/config

