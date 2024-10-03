#!/bin/bash
set -euo pipefail
npm run build
../../../scripts/helm-publish.sh ./dist
rm *.tgz

../../../scripts/npm-publish.sh
