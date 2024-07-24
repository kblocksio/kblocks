#!/bin/sh
set -euo pipefail
./helm-build.sh
helm upgrade --install acme-platform target/main.k8s