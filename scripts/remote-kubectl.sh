#!/bin/sh
set -euo pipefail
cd "$(dirname "$0")"

pem="$HOME/dev.pem"
user=ec2-user
host=kind-control-plane

if [ -z "${DEV_SERVER_IP:-}" ]; then
  echo "Please set DEV_SERVER_IP to the IP of your dev server"
  exit 1
fi

echo "Verifying $pem exists"
if [ ! -f $pem ]; then
  echo "Expected $pem to include the keypair file of your server"
  exit 1
fi
chmod 400 $pem

echo "Adding entries 'kind-control-plane' and 'kind-registry' to /etc/hosts..."
cat /etc/hosts | grep -v "kind-" > /tmp/hosts
echo "$DEV_SERVER_IP kind-registry" >> /tmp/hosts
echo "$DEV_SERVER_IP kind-control-plane" >> /tmp/hosts
sudo cp /etc/hosts /etc/hosts.bak
sudo cp /tmp/hosts /etc/hosts

echo "Setting up local kubectl"
scp -i $pem $user@$host:/home/$user/.kube/config /tmp/kubeconfig
cat /tmp/kubeconfig | sed -e s/0\.\0\.\0\.0/$host/ > ~/.kube/config

kubectl get all