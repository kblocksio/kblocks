#!/bin/sh
set -euo pipefail
dirname=$(cd $(dirname $0) && pwd)

# deploy with port-forward
(cd .. && skaffold run --port-forward)

cd tests
npm run test