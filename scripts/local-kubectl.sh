#!/bin/sh
set -euo pipefail
cd "$(dirname "$0")"

kind get kubeconfig > ~/.kube/config
