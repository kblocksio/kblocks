#!/bin/sh
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <cluster-ip>"
  exit 1
fi

host=$1

echo "Adding 'kind-registry' and 'kind-control-plane' in /etc/hosts to $host"
cat /etc/hosts | grep -v "kind-" > /tmp/hosts
echo "$host kind-registry" >> /tmp/hosts
echo "$host kind-control-plane" >> /tmp/hosts
sudo cp /etc/hosts /etc/hosts.bak
sudo cp /tmp/hosts /etc/hosts

