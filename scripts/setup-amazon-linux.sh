#!/bin/sh
#
# This script is intended to run on an Amazon Linux EC2 host
#
set -euo pipefail

if [ "$(uname -m)" != "aarch64" ]; then
  echo "Unsupported architecture $(uname -m). This script is intended to run on an arm machine."
  exit 1
fi

echo "Installing kind..."
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.23.0/kind-linux-arm64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind
echo "-----------------------------------------------------------------------------------------------------"

sudo yum install -y docker
sudo systemctl start docker
sudo usermod -aG docker $USER
newgrp docker

curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/arm64/kubectl"
chmod +x ./kubectl
sudo mv ./kubectl /usr/local/bin/kubectl
