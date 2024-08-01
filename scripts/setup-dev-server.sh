#!/bin/sh
set -euo pipefail
cd "$(dirname "$0")"

if [ -z "${DEV_SERVER_IP:-}" ]; then
  echo "Please set DEV_SERVER_IP to the IP of your dev server"
  exit 1
fi

user=ec2-user
host=kind-control-plane
pem=$HOME/dev.pem

echo "Checking if $pem exists..."
if [ ! -f $pem ]; then
  echo "Expected $pem to include the keypair file of your server"
  exit 1
fi
chmod 400 $pem
echo "OK"

echo "Adding entries 'kind-control-plane' and 'kind-registry' to /etc/hosts..."
cat /etc/hosts | grep -v "kind-" > /tmp/hosts
echo "$DEV_SERVER_IP kind-registry" >> /tmp/hosts
echo "$DEV_SERVER_IP kind-control-plane" >> /tmp/hosts
sudo cp /etc/hosts /etc/hosts.bak
sudo cp /tmp/hosts /etc/hosts

echo "Checking connection to '$host'..."
ssh -i $pem $user@$host -- echo "OK"

echo "Installing prerequisites..."
ssh -i $pem $user@$host 'bash -s' < ./setup-amazon-linux.sh
echo "OK"

echo "Setting up kind cluster..."
ssh -i $pem $user@$host 'bash -s' < ./reinstall-kind.sh
echo "OK"

echo "Setting up local kubectl..."
scp -i $pem $user@$host:/home/$user/.kube/config /tmp/kubeconfig
cat /tmp/kubeconfig | sed -e s/0\.\0\.\0\.0/$host/ > ~/.kube/config
echo "OK"

echo "Verifying cluster is up..."
kubectl get nodes
echo "OK"

echo "Verifying Docker registry is up..."
docker pull busybox
docker tag busybox kind-registry:5001/busybox
docker push kind-registry:5001/busybox
echo "OK"