#!/bin/sh
set -euo pipefail
./build.sh
helm upgrade --install acme-platform target/main.k8s