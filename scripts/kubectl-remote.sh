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

./update-hosts.sh $DEV_SERVER_IP

echo "Setting up kubectl to connect to $DEV_SERVER_IP..."
scp -i $pem $user@$host:/home/$user/.kube/config /tmp/kubeconfig
cat /tmp/kubeconfig | sed -e s/0\.\0\.\0\.0/$host/ > ~/.kube/config

kubectl get all